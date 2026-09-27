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
  // Fast paths that are exactly equivalent to comparing JSON.stringify output:
  // identical references (same object, same primitive) and the legacy
  // null/undefined coalescing in stableRegionSignature. Numbers deliberately
  // fall through to the string comparison (NaN/Infinity stringify to "null").
  if (previous === next) return true;
  if (previous == null || next == null) {
    return previous == null && next == null;
  }
  const prevType = typeof previous;
  if (
    (prevType === "string" || prevType === "boolean") &&
    prevType === typeof next
  ) {
    // Same-type strings/booleans that failed === can never stringify equal.
    return false;
  }
  return stableRegionSignature(previous) === stableRegionSignature(next);
}

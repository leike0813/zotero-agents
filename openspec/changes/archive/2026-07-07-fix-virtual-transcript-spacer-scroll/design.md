# Design: Virtual Transcript Spacer Scroll Preservation

## Context

The shared Assistant transcript virtualizer renders cached transcript pages as
real rows and represents unloaded rows as top, bottom, or inter-page spacer
height. Before this change, scroll anchoring always resolved the current
`scrollTop` to the nearest rendered row position. That works while the viewport
intersects cached rows, but it is wrong when the user scrolls into an unloaded
spacer.

For example, if only `cursor=80` is cached, rows `0..79` are represented by the
top spacer. When the user scrolls above the first cached row while `cursor=0`
is loading, row-anchor restore can snap the viewport back to the first cached
row boundary. The user experiences this as a scroll wall.

## Approach

The virtualizer now captures two anchor types:

- `row`: the existing stable row key/index plus offset for scroll positions
  inside a rendered row.
- `spacer`: the raw `scrollTop` for scroll positions before the first cached
  row, after the last cached row, or in a gap between cached pages.

`restoreVirtualScrollAnchor()` preserves this split. Row anchors still resolve
against the current virtual row positions. Spacer anchors restore the stored
`scrollTop` directly, so the viewport remains in the unloaded spacer while the
page request is pending.

When the current render captured a spacer anchor, the renderer does not fall
back to the previous row anchor. This prevents stale row anchors from clamping a
valid spacer scroll back to the cached page boundary.

## Boundaries

This change stays entirely inside the shared transcript renderer. It does not
change transcript page DTOs, host snapshot payloads, ACP Skills hydrate logic,
drawer rendering, message coalescing, or panel-specific scroll behavior.

The existing page request dedupe remains the loading guard: scrolling into an
unloaded spacer may request the missing cursor once, and repeated scroll events
must not emit duplicate requests while that cursor is cached or loading.

## Validation

Focused smoke coverage exercises both directions:

- cached later page with an unloaded top spacer preserves upward scroll inside
  the spacer and requests the previous cursor once.
- cached earlier page with an unloaded bottom spacer preserves downward scroll
  inside the spacer and requests the next cursor once.

Existing virtualizer coverage continues to protect sticky-bottom behavior,
variable-height row anchoring, measured spacer sizing, items-only virtual
sources, stale page rejection, and ACP Skills delegation.

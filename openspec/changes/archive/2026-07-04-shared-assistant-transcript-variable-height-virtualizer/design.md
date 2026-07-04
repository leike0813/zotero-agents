# Design: Shared Transcript Variable-Height Virtualizer

## Approach

The shared transcript renderer keeps virtualization state per transcript
container. The virtualizer computes row positions from cached transcript pages,
using measured row heights when available and an item-content estimate for rows
that have not been rendered yet. This avoids mapping `scrollTop` directly to an
item index with a single fixed height.

Before a non-sticky virtual rerender, the renderer records the row intersecting
the top of the viewport plus the pixel offset into that row. After rendering,
it restores `scrollTop` from the same row anchor. Sticky transcript tails keep
the existing bottom-stick behavior.

## Tradeoffs

- Row measurements are renderer-owned and reset with `pageKey`; ACP Skills does
  not keep its own scroll or spacer state.
- Unknown rows use a content-length estimate until measured. This keeps very
  long messages from being skipped before their first render.
- Measurement changes schedule one animation-frame rerender instead of
  recursively repainting synchronously.
- `ResizeObserver` is intentionally omitted for this change; rAF measurement is
  the minimum path needed for current transcript rows.

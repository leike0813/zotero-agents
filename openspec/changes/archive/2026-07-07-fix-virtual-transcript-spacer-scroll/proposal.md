# Fix Virtual Transcript Spacer Scroll

## Summary

Fix a shared Assistant transcript virtualizer regression where scrolling into an
unloaded page spacer can be clamped back to the nearest cached row boundary.

## Problem

When only a later transcript page is cached, the virtualizer represents earlier
rows as a top spacer. If the user scrolls above the first cached row while the
previous page request is loading, the current row-anchor restore path can snap
`scrollTop` back to the first cached row. This makes the transcript feel stuck
at the page boundary.

The same issue can occur symmetrically for an unloaded bottom spacer.

## Goals

- Preserve user scroll position inside unloaded virtual spacer regions.
- Continue requesting uncached pages with existing request dedupe.
- Keep the fix inside the shared transcript renderer.

## Non-Goals

- Change transcript page DTOs or snapshot payloads.
- Change ACP Skills hydrate, spinner, drawer, or message coalescing behavior.
- Add panel-specific virtual scrolling logic.

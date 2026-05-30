## Design Notes

Live UI snapshots contain both user-visible content and operational chrome.
Treating the entire snapshot as one render invalidation unit causes avoidable
DOM churn. The fix is to make invalidation boundaries explicit.

## Synthesis Workbench

- `snapshotContentSignature(snapshot)` is scoped to the active tab and excludes
  action receipts, background job rows, statusbar messages, and other chrome.
- `snapshotChromeSignature(snapshot)` covers statusbar/task-popover data.
- Snapshot delivery performs a full render only when the active content
  signature changes.
- Chrome-only updates replace `.action-statusbar` in place.
- Full renders capture and restore keyed transient state.

## Guardrails

Tests should assert the stability boundary, not exact UI text or DOM order:

- no full snapshot stringification for content invalidation,
- no unconditional Sigma teardown from shell render,
- stable keyed state preservation exists for scroll/details/focus/camera,
- Workspace mount visibility changes do not destroy mounted child panels.


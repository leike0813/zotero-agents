# Optimize ACP Skills Panel Recent Run Index

## Summary

Use a bounded in-memory recent-run index for the ACP Skills panel so opening or
refreshing the panel does not scan and sort the full ACP run history. Also render
drawer-level history notices independently of the running section.

## Problem

The ACP Skills panel only displays a bounded recent run list, but building the
panel currently lists all run records and sorts them before applying that limit.
`prepareAcpSkillRunPanelSnapshot` can also perform the same list work twice for
one refresh. Long-running installations can accumulate many terminal run records,
making ACP Skills tab refresh cost grow with full run history size.

The drawer truncation notice is a drawer-level message, but the renderer appends
it only after a non-empty running section. If only completed runs are visible, the
notice is lost.

## Goals

- Build ACP Skills panel recent runs from a bounded in-memory recent visible
  index.
- Keep startup hydrate as the only full-history pass needed to build that index.
- Preserve the public `listAcpSkillRunSummaries()` behavior for Dashboard,
  Host Bridge, and debugging callers.
- Avoid duplicate panel list queries in `prepareAcpSkillRunPanelSnapshot`.
- Render drawer notices whenever `drawers.notice` is present, independent of
  section shape.

## Non-Goals

- Add a persisted recent-run index file.
- Change Dashboard, Host Bridge, Synthesis, active attention counts, or global
  run history APIs.
- Rework transcript mirror, pagination, or virtualization logic.

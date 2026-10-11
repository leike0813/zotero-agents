# Design

## Context

See proposal.md for motivation. Workbench currently accumulates up to 100 source parents from 25-item Host pages, then filters locally. Reverse-Host continuation tokens are consumed once and expire after ten seconds. Host facts remain the library SSOT; Reference facts provide searchable reference text and binding status.

## Goals / Non-Goals

**Goals:** preserve bounded Host reads, early page paint, virtual-row identity, lazy reference details and notification-driven invalidation while enabling exact global parent totals and arbitrary page navigation.

**Non-Goals:** PDF/note full-text search, new persistent library indexes, maintenance operations or dependency changes.

## Decisions

- ReferenceApplication owns literal case-insensitive metadata/reference matching and effective filters. Summary, references and matches projections share that matcher. Matches emit only source refs; sourceRefs summary reads materialize requested page rows. This prevents a second TypeScript search algorithm and reference hydration from changing parent membership.
- The Workbench host accumulates ordered matching refs using serial source pages. It publishes up to 25 matching summary rows at a time until the current page reaches 100, then continues counting through matches-only reads. Query completion and page completion are separate states.
- Query identity includes library, normalized effective filters, service instance and invalidation revisions. Query generation cancels scans; page generation isolates navigation/details from scans of the same query. Fresh scans replace expired source cursors. Cached refs locate pages without consuming prior continuation tokens.
- Retained session entries reuse a four-entry, 8 MiB LRU budget for query directories and visited page content/details. Oversized directories retain only counts/current-page refs and use bounded rescanning to locate an uncached page; results are never truncated to fit the cache.
- Page/host wire state adds query completion status and first/last or explicit one-based page actions. Native schema adds optional query fields/projection and matchedSourceRefs. Legacy projection defaults remain valid for existing non-paged consumers.
- Default Index rows trust native matching and keep only reference counts; referenced detail rows use the same child matcher. Ordinary library expansions expose all children. Parent page order remains stable Host identity order, with existing display sorting inside the page.
- A fixed footer reuses shared material-symbol icons. The table owns its sole scroll region and an end-of-content spinner; the total-count spinner is independent. Search is debounced at the input and waits for IME composition completion.

## Risks / Trade-offs

- Cold coverage filtering requires readiness reads for source batches. Yield between bounded requests, show results early and reuse valid query directories.
- Host revisions are notification-driven. Use the existing before/after paging revision checks and generation invalidation for targeted reads; do not imply immutable database snapshots.
- Background failure must preserve accepted rows, stop counting and never publish a partial count as an exact total.

## Migration Plan

Ship plugin and native sidecar contract changes together. No persisted schema/data migration. Update current Index guidance and contract corpus before acceptance. Leave the OpenSpec change active after implementation; archiving and Git commits require a separate request.

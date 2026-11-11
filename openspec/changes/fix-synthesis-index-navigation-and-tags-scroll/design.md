# Design

## Context

See proposal.md for the symptoms. Existing host scans already use 25-source batches and 100-parent pages. The page rejects three of five pagination payloads. Hiding Index increments its generation, so returning restores page zero from the LRU. Both Tag tables map every filtered row into DOM. Today's logs show Index RPC timeout followed by control timeout, supervisor restart, and Review unavailability; they do not prove a native crash.

## Goals / Non-Goals

Restore navigation and immediate same-owner return, pause hidden scans, bound Tag DOM, and align rating geometry. Preserve protocol shapes, native deadlines, cache budgets and unrelated in-progress recovery changes.

## Decisions

- Use the existing action payload mapping and validate all five pagination variants at the page boundary. Preserve host readiness and range checks.
- Keep a live query's next cursor and scan offset in its runtime state, separate from the retained session cache. Query identity/generation guards protect accepted work independently of tab visibility. Hidden scans accept an already dispatched batch into their owner but dispatch no further batches; return resumes from the next cursor. Query replacement and closure invalidate old work. Complete and incomplete current pages remain usable while counting is paused.
- Keep one bounded persistent Index mount, following the existing Graph mounting pattern. Suspend its measured-window observers and frames while hidden; reactivate measurement without resetting expansion or scroll. New library/query ownership and successful explicit page changes reset only the corresponding Index view.
- Keep page loading and counting feedback separate using the existing window DTO. A failed query retains accepted rows and known totals and stops both indicators. Do not infer completion from current-page readiness.
- Reuse measured windows for both Tag tables. Stable Tag groups contain each main row and its optional detail row; measurement and focus ownership follow the group. Select-all continues to mean every filtered Tag, not merely mounted rows.
- Render stars as one SVG path with clipped filling, avoiding glyph-dependent offsets and per-instance clip IDs.
- Extend existing controller, host, DOM and unified Zotero E2E tests. Record service identity and health evidence during Tag scrolling/tab switching across two health periods; frontend test success alone cannot close the service-stability acceptance task.

## Risks / Trade-offs

- Hidden/in-flight races → retain a single live traversal and fence by owner; test replacement, closure and rapid returns.
- Hidden DOM measurement → suspend observers/RAF and remeasure only after activation; preserve stable heights and keys.
- Restart causality remains uncertain → require isolated production acceptance and continue diagnosis if service identity changes; keep existing health/restart policy.
- Existing service recovery work overlaps native acceptance infrastructure → retain those edits and integrate without reverting them.

## Migration Plan

No persisted data or wire migration. Build through the existing preflight and run current-source sidecar acceptance against isolated data. Record exact validation outcomes in tasks.md.

## Context

See `proposal.md`. The migration preview and conversions are already process-local and restart-invalidated, while receipts and apply progress are durable. Dashboard already refreshes every 1200 ms. Synthesis page sources are owned under `src/synthesis`, but the hosted document currently versions only part of its coordinated asset set.

## Goals / Non-Goals

**Goals:** fix errors at their ownership boundary, preserve all non-target data, keep migration reads and UI bounded, and reuse existing Dashboard snapshots and Review interaction patterns.

**Non-Goals:** no Rust sidecar build, database migration, new transport, fuzzy reference matching, background migration, or exposure through Host Bridge/Workflow APIs.

## Decisions

1. Translate codec resource-limit exceptions in the Broker method shared by note-detail callers. The synthesis adapter continues to consume only public capability codes.
2. Use one explicit UI revision on the hosted page URL, local stylesheet, and local bundle. This is smaller and safer than introducing build-time asset-manifest machinery.
3. Add `literature-matching-metadata-json` to the converter's known auxiliary set and keep cleanup target-specific. Mixed notes retain auxiliary blocks when migrated target blocks are removed.
4. Extend the existing process-local RuntimePlan with issue choices and dispositions. Issue and option IDs are opaque, bounded, and valid only for the current scan basis; no new persistence table is needed because previews already require a fresh scan after restart.
5. Extend the internal scan host seam with a progress callback that also reports whether admission should continue. Dashboard projects the active progress through its existing polling cycle rather than adding events.
6. Filter the full RuntimePlan before slicing a 25-row page. The page carries bounded issue summaries for its rows so opening a drawer remains local UI state; only filters and issue decisions cross the host action boundary.
7. Reuse the existing selection action as candidate approval/skip and add only two actions: candidate query and issue resolution. Apply uses the resolved conversion held by the runtime and performs the existing source re-read, basis check, canonical verify, then cleanup sequence.

## Risks / Trade-offs

- [Historical notes can combine target and auxiliary blocks] → cleanup removes or rewrites only consumed target blocks and verifies preserved auxiliary content.
- [Issue choices become stale] → every choice is bound to the scan plan and apply rejects a changed basis.
- [Periodic progress is not sub-second] → the existing 1200 ms cadence is sufficient for user feedback and avoids another synchronization channel.
- [Some damage is not safely repairable] → the drawer offers only evidence-supported options; otherwise the candidate can be skipped or rescanned after source repair.

## Migration Plan

Advance the migration definition to version 4. Existing history remains readable, but old previews cannot execute. Build and install the plugin XPI with the coordinated Synthesis asset revision; no sidecar prebuild or database migration is required.

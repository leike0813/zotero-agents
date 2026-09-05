## Context

See proposal.md. Baseline HEAD is 4fb76b73; the existing uncommitted Preact migration is implementation input and must be preserved. Audit checks: Dashboard 104 new and 79 existing tests pass; combined new page tests have 201 passes and 13 failures in ReviewCenter/Reader. New Synthesis assembly still renders placeholders.

## Goals / Non-Goals

**Goals:** Complete the approved region architecture and all existing page behaviors with bounded rendering, typed wire ownership, and independent export entries.

**Non-Goals:** Backend protocol or business changes, dependency installation, development servers, commits, release publication, or unrelated cleanup.

## Decisions

- Shared wire contracts own concrete portable DTOs and action payload mappings. Reuse package DTOs through shared imports. Host normalization stays in its existing owner; components receive concrete data rather than duplicating boundary decoding.
- Keep existing components and assemble their projections in the hosted renderer. Shell, chrome, surface, graph and reader state use their own signatures; graph pages never enter chrome signatures.
- Merge accepted graph pages into current owner state before rendering. Preserve Sigma and camera for matching owner/basis; interaction updates do not rebuild topology. Dispose timers, observers and listeners with their owning region/page.
- Use measured rows, viewport overscan and spacers for Topics/Registry. Keep selection by ID and retain keyboard focus; offscreen rows leave the DOM. Incremental append-to-all is not bounded windowing.
- Keep hosted, graph-only and topic-export entries separate. Export entries import only needed components and shared projection/action logic, never the hosted full renderer. Inject installed graph vendors through props. Keep current external asset names and adjust only topic export's packaged resource selection.
- Localize at render time and use the shared synthesis Markdown profile. Retain bounded content-specific Markdown enrichment, not whole-page reverse translation.
- Port behavior assertions away from old-source extraction. Test actual bootstrap, message delivery, DOM identity and browser interactions; static corpus parity alone is not UI evidence.

## Risks / Trade-offs

- Existing independent components may not preserve every old action → exercise all surfaces through the actual assembly before entry replacement.
- Tests include environment and fragile text failures → fix helpers/behavior assertions without weakening stable behaviors.
- Real Zotero availability is environmental → report runtime acceptance separately and never mark unavailable checks passed.

## Migration Plan

Complete Dashboard and shared contracts, connect Synthesis surfaces and messages, fix bounded lists/reader tests, switch all build/export entries, regenerate owned assets, then run integration and browser checks. Remove the old renderer in this same working-tree change; do not create a dual implementation flag. Preserve unrelated edits throughout.

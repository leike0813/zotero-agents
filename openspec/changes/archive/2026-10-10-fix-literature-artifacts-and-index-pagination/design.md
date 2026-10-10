## Context

See proposal.md for motivation and the confirmed diagnosis report for evidence. The converter already shares a cooperative generator between synchronous and asynchronous callers. Host Index pages already carry opaque cursor and Host/Reference basis. The item query already computes its total, but that fact is discarded before reverse-host projection.

## Goals / Non-Goals

Keep canonical validation, Broker readiness, bounded reads and measured virtual rows authoritative. Reuse existing receipt storage, Notifier markers and Workbench action/snapshot transport. Real-library writes, receipt rewrites, whole-library search and publishing are outside this change.

## Decisions

- References decoding retains source presence and valid shape independently of entry count. Empty readable collections and valid empty canonical bases are accepted; missing, malformed or discarded invalid entries retain their existing blocking/review semantics. Citation summary reads only summary. Definition version becomes 8.
- Validator issues optionally carry numeric limit/actual evidence. Conversion diagnostics preserve path/code and this evidence without payloads. One bounded deduplication policy prioritizes validation/blocking evidence before repetitive evidence and is reused by receipt persistence.
- Each parent column entry owns last successful state, dirty/pending status and retry budget. Replacing its entry on invalidation makes old callbacks inert. Retry delays are 1, 2 and 4 seconds; further provider calls wait for a real invalidation. UI-only notifications do not reset that budget. Clearing entries cancels retry timers and invalidates pending completions.
- Index uses 100-parent windows, progressively read in batches of at most 25 and remaining capacity. Window readiness is distinct from source exhaustion. The live host owns window-start cursor history, next cursor, basis, generation and owner identity; the page receives no cursors.
- `navigateIndexWindow` carries direction `previous` or `next`. `registry.window` contains one-based number, zero-based offset, nullable total, hasPrevious, hasNext and status (`loading`, `ready`, `failed`). Filtering uses only current-window rows. Explicit navigation clears expanded refs and starts at the top; hydration and append within a window retain row anchors.
- First-window session data retains successful rows/details within the existing four-entry/8 MiB limits. Reopening starts at window one. Exhausted valid caches need no source reread; caches requiring continuation paint immediately and rebuild live cursor boundaries using fresh reads. Real invalidation/service changes reset traversal. Failed refreshes retain successful content; basis mismatch rejects continuation and requires restart through refresh.
- Host item pages expose required nonnegative total. Rust Reference pages preserve it and Workbench library pages publish it; referenced pages publish null because post-filtered match totals are unknown. Schema and corpus are updated together; canonical artifact schemas are unchanged.

## Risks / Trade-offs

- Strict new total fields require matching plugin/sidecar builds; verify both from current source before delivery.
- Sparse referenced scopes may need several empty Host pages; keep cursor-cycle checks and owner/generation cancellation while reading them.
- First-window reopening does not restore a later browsing position, as explicitly selected by the user.

## Migration Plan

Add regression cases before each implementation slice, then run relevant Node/Rust checks, cross-language validation, type/lint checks and local builds. New migration scans use definition 8; existing receipts remain intact. No automatic data migration is performed.

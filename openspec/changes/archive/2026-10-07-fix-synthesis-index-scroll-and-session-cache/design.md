# Design

## Context

See proposal.md. Production Index currently collects 100 Host items per read, fully evaluates readiness, and includes references for expanded sources. Surface cache identity lasts only as long as a mounted runtime. Strict protocol schemas reject undefined optional fields. Existing measured windows and region signatures remain the owners of DOM identity.

## Goals / Non-Goals

**Goals:** First-batch visibility, bounded continuation, targeted hydration, valid session reuse, and stable measured scrolling.

**Non-Goals:** Disk cache, dependency changes, automatic Reference cache rebuild, and expanding the current 100-row presentation window.

## Decisions

- Extend the existing Index registry request with optional `cursor`, `limit`, `expectedBasis`, and `sourceRefs`. `sourceRefs` selects details and is mutually exclusive with paging fields. Workbench uses batches of 25; requests without paging fields preserve the current bounded projection. This avoids a parallel client capability.
- Index page metadata carries cursor, continuation, returned count, limit, and an opaque basis binding library, scope, Host snapshot revision and a process-local repository change revision. The revision comes from the writer connection's constant-time `total_changes()` read: existing Reference basis hashes scan full tables and would make every new page expensive. This conservatively rejects continuations after unrelated repository writes; a Reference-specific revision is warranted only if that churn becomes observable. Readiness and projection must not publish after a basis changes. Empty referenced source pages are valid nonterminal results.
- Explicit details use Host get-by-ref plus source-bound repository reads, skip readiness, and merge only reference arrays/counts into successful summaries. Cache hydrated arrays, including empty results, rather than treating an empty array as a cache miss.
- Workbench host owns Index loading generation, accumulation, publication, and session entries. Serial continuation stops when hidden, closed, superseded, or 100 visible rows are reached. Cached partial data is displayable but its one-use expiring Host cursor is never retained for reopening.
- Reuse the surface projection and invalidation owners. Cache entries are keyed by library/scope and carry service identity and invalidation revision. Retain at most four entries / 8 MiB with least-recently-used eviction; oversized entries stay live but are not retained. Library and Index sidecar invalidation clear eligible session reuse even with no mounted page.
- Flatten the measured table into parent/reference rows with stable keys. Logical filter changes reset scrolling; row count and batch append do not. The shared window preserves a visible-row anchor across offset changes and retains focused rows.
- Tag custom-column UI-only refreshes at the producer. Ignore only tagged events, preserving native parent refreshes caused by real attachment/note changes. Keep strict JSON validation and the private boolean echo port; native composition translates its typed receipt explicitly.

## Risks / Trade-offs

- Slow cold artifacts → 25-source batches remain under the existing per-request deadline; measure real-process first-batch timing separately from synthetic test timing.
- Mutations during pagination → basis checks and host invalidation generation reject stale results while keeping last-good content.
- Cached partial data → restart reads with fresh cursors, publish replacements only for the new generation, and preserve row identity.
- Shared window changes affect other tables → run existing Topics, canonical, focus-retention, and grid window checks.

## Migration Plan

Ship plugin and current-source native sidecar together with the updated closed schema/corpora. No stored-data migration. Existing strict production validation continues to reject incompatible sidecars. Reverting the code requires no cache-file cleanup because retention is process-local.

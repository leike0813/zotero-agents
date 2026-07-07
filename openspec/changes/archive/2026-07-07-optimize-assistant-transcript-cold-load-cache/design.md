## Context

ACP Chat and ACP Skills use file-backed transcript stores with JSONL operation
logs and `transcript.index.json`. Both subsystems can read transcript pages from
the index, but foreground panel snapshots still depend heavily on in-memory full
mirrors for selected page rendering.

Live transcripts need full mirrors because they receive high-frequency append
events. Completed or otherwise cold transcripts do not need full mirrors for
correct first paint; they only need the selected page.

## Goals / Non-Goals

**Goals:**

- Make cold foreground transcript rendering page-first.
- Preserve live transcript full mirror behavior.
- Add a simple owner-level 10-slot LRU for cold full mirrors.
- Keep full mirror cache as a performance optimization only.

**Non-Goals:**

- No per-page cache window in this change.
- No item/byte budget in this change.
- No transcript store format change or migration.
- No UI dev-server verification.

## Decisions

### Decision 1: Split page readiness from mirror readiness

Cold selected transcript pages SHALL be considered renderable when the indexed
page read succeeds, even if the full mirror is not loaded. The full mirror state
remains relevant for live streaming and cache hits, not for cold first paint.

### Decision 2: Cache full mirrors by owner

The cache keeps full mirrors, not page windows. ACP Skills uses `requestId` as
the owner key. ACP Chat uses `backendId + "\n" + conversationId`.

This is less memory-efficient than page windows, but it keeps state management
simple and preserves fast task switching for recently viewed completed tasks.

### Decision 3: Pin live mirrors outside the cold LRU

Lifecycle-open ACP Skills runs and live ACP Chat sessions remain pinned and do
not count against the 10-slot cold cache. Eviction only releases cold,
non-pinned mirrors.

### Decision 4: Background hydrate is optional for cold correctness

Panel snapshots may schedule a background full hydrate to warm the LRU, but the
snapshot must not wait for it before returning a selected transcript page.

### Decision 5: ACP Skills selection is a two-phase foreground transition

ACP Skills cold run selection must publish owner change before any cold page read
or full hydrate can consume the UI critical path. The first snapshot after a
selection is allowed to contain only selected run metadata and a loading
transcript state. A queued follow-up performs the indexed page read and may then
warm the full mirror in the background.

The selection operation itself must not schedule full hydrate. This keeps child
`pendingSelectedRequestId` guards from waiting on transcript IO before they can
accept the new selected owner.

### Decision 6: ACP Skills page reads batch event ranges per page

The existing ACP Skills transcript index remains an event-offset catalog in this
change, but page reads must not open and close `transcript.jsonl` for every
indexed event. A selected page read gathers all ranges for the page, reads them
through a single batched runtime range helper, and then folds events per item.

This keeps the file format stable while removing the worst cold-read IO pattern
for event-heavy tool or assistant transcript items.

### Decision 7: Virtual unloaded gaps get renderer-owned loading sentinels

The shared transcript renderer owns page cache gaps. When the viewport lands in
an unloaded gap with a previous or next cursor, the renderer should request that
page and place a small loading sentinel inside the gap. The sentinel is a
renderer affordance, not an ACP Skills-specific state, and it does not introduce
a second page cache.

### Decision 8: Owner transitions are global Assistant Workspace behavior

ACP Chat conversation/backend switches and ACP Skills run switches use the same
owner-first contract. Selection APIs update only the selected owner. The host
posts a loading-first snapshot so the child can switch owner immediately, then
queues a page-first follow-up guarded by the captured owner key. Indexed page
reads and background full mirror hydrate are not allowed to block owner first
paint.

## Risks / Trade-offs

- Ten large cold mirrors can still use noticeable memory. This is accepted for
  v1 by product choice; real telemetry can justify an item/byte budget later.
- Background full hydrate may still consume IO. Mitigation: it is not on the
  critical path and can be skipped when a mirror is already loaded or hydrating.
- ACP Chat and ACP Skills retain separate cache implementations. Mitigation:
  tests lock the same policy and owner-transition timing in both subsystems.

## Migration Plan

1. Add page-first selected snapshot paths for ACP Skills and ACP Chat.
2. Add 10-slot cold mirror LRU retention and eviction.
3. Keep live mirror pinning behavior unchanged.
4. Add ACP Skills loading-first selected snapshots for foreground selection and
   tab/init paths.
5. Batch ACP Skills indexed page range reads and render virtual loading
   sentinels for unloaded gaps.
6. Add ACP Chat loading-first/page-first selected owner transitions for
   conversation/backend selection, new conversation, init, and tab switch paths.
7. Validate focused/full ACP transcript suites and OpenSpec strict validation.

## Open Questions

- No blocking questions. Item/byte guards remain a future enhancement.

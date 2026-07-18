## Context

The v3 publication vocabulary is shared, but the round2 implementation stops being incremental after the wire boundary. Producers still collapse most non-append changes to full-item upserts, the browser receiver clones and reindexes the complete page, and the renderer includes `uiRevision` in its order signature so every delta can clear and rebuild visible rows. Initial Chat delivery also crosses three independently scheduled queues: Host snapshot preparation, Shell forwarding, and child `requestAnimationFrame` rendering. Typed page publication is neither retained until child readiness nor sequenced behind owner commit. Replay then observes late acknowledgements from this preparation work after the profile begins and reports identities that have no in-window post.

Chat and Skills ship in one plugin and already use the same v3 protocol. The repair therefore uses an atomic current-state implementation with no old-wire compatibility branch.

## Goals / Non-Goals

**Goals:**

- Make producer, coordinator, Shell, child model, renderer, acknowledgement, and replay barrier one closed shared data path.
- Make steady transcript work proportional to the affected mutation and visible row, not accumulated page or text.
- Make first-open and child-document replacement recover without user tab/session switching.
- Give Chat and Skills identical field meanings, delivery decisions, and acknowledgement outcomes.
- Make target-active evidence include exactly the publications posted inside the selected profile window.

**Non-Goals:**

- Do not change Chat or Skills transcript stores, persistence, JSONL/index formats, execution display modes, or external APIs.
- Do not make full mirrors or page caches correctness dependencies.
- Do not fold SkillRunner into the ACP publication protocol; it keeps a separate readiness contract.
- Do not claim real-host latency from logical cadence evidence.

## Decisions

### 1. One before/after projector is the mutation semantic source

Both producer seams capture the normalized visible item before and after a store event and call one projector. New items and identity changes produce `upsert_item`; pure suffix growth produces `append_text`; stable-item field changes produce a minimal `patch_item`; disappearance produces `delete_item`. This removes surface-specific heuristics and the current full-upsert fallback. The snapshot page remains the rebase truth, not a steady diff source.

### 2. A transcript owner has one ordered lane

The coordinator serializes loading snapshot, ready page, delta, resync, page switch, and rebase in one owner lane. `pageKey` is lane state rather than an independently advancing queue, so page transitions cannot overtake initialization. Page reads may run concurrently with loading publication construction, but publication order is fixed by the lane and advances only on accepted render completion or a terminal rejection.

This is deliberately stronger and simpler than independent owner/page queues: every owner/page still has at most one in-flight publication, while initialization and page-switch races disappear.

### 3. Delivery readiness is document-generation scoped

Each child reports a document-generation token. Shell retains typed publications before forwarding, orders them by `deliverySequence`, removes them only after terminal child acknowledgement, and replays them after readiness for the current generation. Duplicate delivery of a `publicationId` is idempotent. Host initialization state records actual publication lifecycle rather than an async task having been scheduled.

The shared child client serializes full owner snapshots and typed publications in one FIFO. Owner state is committed synchronously before a later typed publication can validate against it. A new child generation requests a current activation snapshot instead of relying on the replaced document's revision.

### 4. The receiver returns render effects, not a rebuilt page

The shared receiver maintains a stable item map plus ordered item ids and applies copy-on-write to touched entries. It returns a bounded render effect: snapshot/rebase, append, upsert, patch, delete, or metadata-only. The renderer preserves unaffected row nodes, updates only the affected row/text node, and adjusts virtual spacers without clearing the transcript container. `uiRevision` participates in continuity validation but never in DOM order identity.

Full transcript render is restricted to initialization, activation, explicit page request, rebase, display-mode switch, or an explicit virtual-window reset. `render-complete` is emitted only after the effect succeeds; exceptions produce terminal `render-failed`.

### 5. Replay uses an exact lifecycle barrier and post-owned identities

The force-publication port returns `source`, tab, `publicationId`, and `deliverySequence`. Drain waits for all same-source, same-tab publications at or below that sequence. The profiler creates an identity only after observing its in-window `panel_post`; acknowledgements for unknown identities are counted as out-of-window diagnostics but cannot make the measurement incomplete. Labels are derived from coordinator lifecycle metadata, never a Chat default builder.

SkillRunner target readiness remains a separate wait result. Report filename and internal phase are derived from the same frozen replay configuration and are validated together.

## Risks / Trade-offs

- [A missing producer field could make a patch differ from its snapshot truth] → Parameterized production-adapter tests replay the same events through mutations and explicit rebase pages.
- [A lost terminal ACK can retain an in-flight publication] → Shell replays by document generation and receiver returns the cached terminal outcome for duplicate publication ids.
- [Targeted virtualized updates can leave spacer geometry stale] → Structural effects recalculate only affected row height/order and verify scroll/off-page invariants in browser tests.
- [Strict profile ownership can hide useful late ACK diagnostics] → Late ACKs remain in bounded counters and warnings but are excluded from lifecycle identity equality.
- [Atomic browser migration touches both children] → Both children move to the shared client in the same task; no surface fallback or old-field alias is retained.

## Migration Plan

1. Add failing production mutation, delivery race, DOM identity, and profile-window tests.
2. Replace the producer projector and coordinator lane, then make Shell delivery generation-aware.
3. Move both child panels to the shared FIFO receiver and targeted renderer effects.
4. Repair replay barriers, profiler identity ownership, labels, and report provenance.
5. Remove superseded state flags, page clone/reindex paths, revision-driven clears, duplicate child ACK logic, and obsolete fixtures.
6. Run Node/browser/Zotero gates and same-provenance formal replay before archiving.

Rollback uses the existing backup branch for the failed round2 history. The repaired code itself contains no runtime rollback or compatibility path.

## Open Questions

None. The v3 vocabulary, shared-surface requirement, delivery semantics, performance evidence classes, and storage boundaries are fixed.

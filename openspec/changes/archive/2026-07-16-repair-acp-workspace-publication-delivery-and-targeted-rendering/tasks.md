## 1. Failure-contract TDD

- [x] 1.1 Extend the parameterized Chat/Skills conformance suite through the production adapters for canonical append/patch/upsert/delete decisions and mutation-proportional cost.
- [x] 1.2 Add Shell and child ordering tests for late readiness, owner commit, duplicate replay, document replacement, active old-owner recovery, and terminal render failure.
- [x] 1.3 Add browser DOM identity tests for append, target-row finalization, structural mutations, off-page metadata, and revision-only updates.
- [x] 1.4 Add profiler/replay tests for pre-window late ACK exclusion, canonical Skills labels, exact delivery barriers, SkillRunner readiness, and phase provenance.

## 2. Producer and coordinator repair

- [x] 2.1 Implement the shared before/after transcript mutation projector and migrate Chat and Skills producer seams together.
- [x] 2.2 Serialize initialization, page-ready, delta, resync, page transition, and rebase in one owner-scoped coordinator lane.
- [x] 2.3 Remove full-item patch fallbacks, snapshot reserve/adopt split state, timer-based ordering, and obsolete producer/coordinator helpers.

## 3. Reliable Shell and child delivery

- [x] 3.1 Add child document generations and make Host initialization state reflect actual publication delivery rather than scheduled work.
- [x] 3.2 Retain typed Shell publications until terminal child ACK and replay them in delivery order after child readiness or document replacement.
- [x] 3.3 Move Chat and Skills to one shared child FIFO/receiver with idempotent publication results and current-owner rebase recovery.

## 4. Targeted browser rendering

- [x] 4.1 Replace complete-page clone/reindex with a stable shared item map/order model and bounded render effects.
- [x] 4.2 Apply append, patch, upsert, delete, and off-page effects to target nodes while preserving unrelated transcript and managed-region identity.
- [x] 4.3 Remove transcript revision from DOM order identity and emit accepted render completion only after successful DOM work.

## 5. Replay and profiler closure

- [x] 5.1 Make lifecycle identities post-owned, classify unknown ACKs as out-of-window, and derive labels from canonical coordinator metadata.
- [x] 5.2 Implement source/tab/delivery-sequence barriers, wait all matching earlier publications, and keep SkillRunner on a separate readiness result.
- [x] 5.3 Measure post-to-accepted-render duration and validate internal phase against result artifact provenance.

## 6. Documentation and verification

- [x] 6.1 Update the round2 failure review, profiler documentation, and Chat/Skills parity documentation with the repaired current-state data flow and evidence rules.
- [x] 6.2 Run focused Node/browser/Zotero tests, lint, build, and strict OpenSpec validation; confirm no generated help-docs or unrelated worktree drift.
- [x] 6.3 Run same-provenance boundary formal replay on available Zotero hosts and record transcript visibility, lifecycle completeness, materialization, byte, target-active, and drift evidence.


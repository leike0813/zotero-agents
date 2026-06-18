## 1. Contract and Test Baseline

- [x] 1.1 Validate the new OpenSpec change artifacts with `npx openspec validate throttle-skillrunner-stuck-run-observation --strict`.
- [x] 1.2 Identify existing SkillRunner client, reconciler, and session-sync tests that can be extended without adding timing-fragile assertions.

## 2. Provider Poll Deadline

- [x] 2.1 Update `src/providers/skillrunner/client.ts` so `executePollStep()` uses a fixed poll start/deadline across all non-terminal iterations.
- [x] 2.2 Ensure poll timeout after `requestId` creation remains recoverable and preserves request context rather than fabricating terminal failure.
- [x] 2.3 Extend focused provider tests to cover repeated quick `queued` responses reaching the absolute timeout.

## 3. Reconciler Backoff

- [x] 3.1 Add optional request-local cadence metadata to SkillRunner recoverable/reconcile context parsing and persistence.
- [x] 3.2 Update `src/modules/skillRunnerTaskReconciler.ts` to skip unchanged non-terminal requests until their next allowed reconcile time.
- [x] 3.3 Reset cadence on state changes, waiting states, terminal settlement, and backend-level communication failures.
- [x] 3.4 Add a ready/visible ownership guard before reconciler-driven session sync so pre-ready or locally invisible requests do not start events observation.
- [x] 3.5 Extend existing reconciler tests so unchanged queued requests are not polled every global tick while task rows remain visible.

## 4. Session Sync Entry Gating

- [x] 4.1 Update `ensureRunningSessionSync()` and/or `src/modules/skillRunnerSessionSyncManager.ts` so pre-ready or locally invisible requests cannot start `events/history -> events SSE`.
- [x] 4.2 Update session sync entry gating so long-unchanged queued requests do not repeatedly start `events/history -> events SSE`.
- [x] 4.3 Keep `running`, `waiting_user`, and `waiting_auth` states eligible for normal session sync once the request is ready and visible.
- [x] 4.4 Add or extend a focused session-sync/dashboard observer test for duplicate queued-state start suppression and pre-ready invisible request suppression.

## 5. Visibility Boundary Tests

- [x] 5.1 Extend request-created/request-ready workflow seam tests to assert request-created alone does not create observation UI, recoverable observation, or session sync.
- [x] 5.2 Add a regression test for an upload-stalled SkillRunner request: request id is retained for dispatch bookkeeping, but no invisible task drives events polling.

## 6. Verification

- [x] 6.1 Run the focused SkillRunner test set covering provider polling, reconciler behavior, session sync entry behavior, and request-ready visibility boundaries.
- [x] 6.2 Run `npx tsc --noEmit`.
- [x] 6.3 Run `git diff --check`.

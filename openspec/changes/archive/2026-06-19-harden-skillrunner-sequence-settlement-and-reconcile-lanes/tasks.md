# Tasks

## 1. Connection Governance

- [x] 1.1 Add `reconcile` and `health` SkillRunner connection lanes.
- [x] 1.2 Raise default per-backend active connection budget from four to six.
- [x] 1.3 Set lane priority to `submit > settlement > reconcile >
  foreground-query > foreground-stream > background > maintenance > health`.
- [x] 1.4 Keep two reserved slots for critical lanes when low-priority work is
  queued.
- [x] 1.5 Allow `submit`, `settlement`, and `reconcile` to evict warm
  foreground streams when the backend cap is full.

## 2. Reconcile And Health

- [x] 2.1 Route `getRunState()` and terminal double-confirm through the
  `reconcile` lane.
- [x] 2.2 Route ping/reachability probes through the `health` lane.
- [x] 2.3 Stop treating backend health flag as a blocker for known active run
  reconciliation.
- [x] 2.4 Make successful direct active-run reconciliation clear backend health
  failure state.
- [x] 2.5 Make `promptReconcileRequests()` enqueue work without synchronously
  waiting for a long global reconcile flush.
- [x] 2.6 Remove automatic background history/session sync from the reconciler
  main path.

## 3. Sequence Settlement

- [x] 3.1 Persist sequence step identity in `ReconcileContext` and
  `SkillRunnerRunStore`.
- [x] 3.2 Preserve `workflowRunId`, `sequenceStepId`, `sequenceStepIndex`,
  `sequenceJobId`, and `sequenceStepSkillId` across restore.
- [x] 3.3 Continue SkillRunner sequence steps after result/handoff projection.
- [x] 3.4 Move sequence step apply to side-effect settlement so it does not block
  next-step submission.
- [x] 3.5 Settle SkillRunner sequence workflow completion by root sequence id.
- [x] 3.6 Suppress request-level workflow summaries for non-terminal sequence
  step settlement.

## 4. Tests

- [x] 4.1 Add governor tests for `reconcile`/`health`, six active connections,
  and critical-lane stream eviction.
- [x] 4.2 Add reconciler regression coverage for direct active-run reconcile
  while backend health is flagged.
- [x] 4.3 Add sequence regression coverage for stable step identity,
  continuation before apply settlement, and sequence-level completion.
- [x] 4.4 Update deferred completion tracker tests for sequence root tracking.
- [x] 4.5 Run focused SkillRunner validation, TypeScript, and `git diff --check`.

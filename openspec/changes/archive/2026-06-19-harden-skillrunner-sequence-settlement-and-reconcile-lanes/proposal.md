# Change: Harden SkillRunner Sequence Settlement And Reconcile Lanes

## Why

The request-ready settlement and UI stream-pool work moved SkillRunner execution
toward a reconciler-owned frontend protocol, but live sequence testing exposed a
remaining gap: terminal state polling, backend health probes, history sync, and
sequence side-effect apply could still interfere with one another.

The user-visible symptoms were:

- a terminal backend run staying visible as running because foreground/history
  or health work blocked state reconciliation
- sequence steps reusing inconsistent local identities after continuation or
  recovery
- a non-final sequence step causing workflow completion/toast settlement before
  the root sequence was actually terminal
- sequence continuation being vulnerable to deferred apply latency or failure

## What Changes

- Add separate SkillRunner connection lanes for `reconcile` and `health`.
- Raise the per-backend plugin connection budget to six active connections.
- Let critical lanes (`submit`, `settlement`, `reconcile`) evict warm UI
  streams when the backend cap is full.
- Keep health probes isolated from active run reconciliation; health gating must
  not suppress direct terminal polling for already-known active runs.
- Persist sequence step identity across run-store records and restored
  reconciler contexts.
- Continue SkillRunner sequences after result/handoff projection, then settle
  apply as a side effect.
- Settle SkillRunner sequence workflow completion by root sequence id, not by
  the first step request id.

## Impact

- `provider-adapter`: SkillRunner connection lane taxonomy and per-backend
  budget are refined.
- `workflow-execution-seams`: SkillRunner sequence completion is root-owned and
  apply-independent.
- `task-dashboard-skillrunner-observe`: backend health no longer blocks direct
  observation of active runs.
- `task-runtime-ui`: sequence step records retain stable identity and apply
  state remains projected independently of run terminal state.

## Non-Goals

- No SkillRunner backend protocol changes.
- No ACP Skills foreground apply changes.
- No return to background-per-run SSE streams.

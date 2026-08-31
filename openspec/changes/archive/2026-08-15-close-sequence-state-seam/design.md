## Context

`sequenceStateStore` currently exposes ten mutation functions:
`recordSequenceStepStarted`, `recordSequenceStepRequestCreated`,
`recordSequenceStepSucceeded`, `recordSequenceStepWaiting`,
`recordSequenceStepTerminal`, `recordSequenceStepApplyResult`,
`recordSequenceStepLifecycleSettled`, `markSequenceRunContinuing`,
`markSequenceRunWaitingInteraction`, and `markSequenceRunTerminal`.

`sequenceRuntime` owns the happy-path step progression and terminal decision.
`acpSkillRunStore`, `skillRunnerForegroundContinuation`, and
`acpSkillRunRecovery` write waiting and terminal facts from their recovery
paths. `terminalResolution` remains a read-only consumer.

## Goals / Non-Goals

**Goals:**

- Give sequence run state one write seam and one event vocabulary.
- Let the state module own request identity conflict handling, root request
  id, terminal step id, and run terminal derivation.
- Preserve current conflict, idempotency, and persistence behavior.
- Delete the unused `markSequenceRunWaitingInteraction` export.

**Non-Goals:**

- Persisting a sequence event log.
- Changing the persisted state schema or storage entries.
- Merging `terminalResolution` into the state module.
- Moving provider execution, apply execution, or UI subscription ownership.

## Decisions

### Fact events plus a reducer

`applySequenceRunEvent(event)` accepts ten fact event types. The reducer
derives `status`, `rootRequestId`, and `terminalStepId` from the stored
request and event payloads. Callers never submit `completed` directly.

Event types:

- `sequence.step.started`
- `sequence.step.request_created`
- `sequence.step.succeeded`
- `sequence.step.waiting`
- `sequence.step.terminal`
- `sequence.step.apply_result`
- `sequence.step.lifecycle_settled`
- `sequence.run.continuing`
- `sequence.run.waiting_interaction`
- `sequence.run.terminal`

### Preserve current conflict and idempotency semantics

`request_created` and `succeeded` throw on request identity conflicts.
`waiting` and `terminal` may fill or replace a missing request identity.
Run terminal is idempotent after any terminal state. Apply and lifecycle
settlement keep their current overwrite behavior.

### Move terminal policy into the state module

`matchesShortCircuitRule` and `resolveStepApplyFailureMode` move into
`sequenceStateStore`. Their shared dot-path and primitive equality helpers
move to `workflowExecution/valuePath.ts` because `sequenceRuntime` still uses
dot-path resolution for handoff bindings.

### Keep terminalResolution read-only

`terminalResolution` continues to read sequence state and canonical run
records. Folding it into the state module would create a cycle through the ACP
and SkillRunner stores, so it remains a separate read-only module.

## Risks / Trade-offs

- [Reducer grows the store module] -> The module already owns parse, migration,
  persistence, and subscription; transition rules add locality rather than a
  new seam.
- [Behavior drift while migrating four callers] -> The new reducer tests lock
  the old semantics before callers move.
- [Integration tests seed state through old mutations] -> Setup calls migrate
  to the event seam; direct record-level assertions are deleted.
- [No explicit completed event surprises future readers] -> OpenSpec spec delta
  records that completed is derived.

## Migration Plan

1. Add reducer tests that lock the event contract and preserved semantics.
2. Implement `valuePath.ts` and `applySequenceRunEvent`.
3. Migrate `sequenceRuntime` to emit events and consume derived state.
4. Migrate the three recovery/continuation writers to events.
5. Delete old mutation exports and migrate all integration test setup.
6. Update the workflow-execution-seams spec and run focused/full verification.

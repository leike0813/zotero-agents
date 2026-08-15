## Why

Sequence run state is written through ten fine-grained mutation entry points.
Four modules decide step and run transitions, so terminal rules, root request
identity, and terminal step identity leak across the seam. Tests must learn
the mutation vocabulary instead of one event contract.

## What Changes

- Extend `sequenceStateStore` with one event entry point:
  `applySequenceRunEvent(event)`.
- Reduce ten mutation exports to one write seam; callers submit facts and the
  module owns transition rules.
- Move short-circuit and apply-failure policy into the state module.
- Preserve persisted state shape and `workflow.sequence.state.v2` schema.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require sequence run state to be written through
  fact events and terminal completion to be derived by the state reducer.

## Impact

- Removes the ten mutation exports from `sequenceStateStore`.
- Migrates `sequenceRuntime`, `acpSkillRunStore`,
  `skillRunnerForegroundContinuation`, and `acpSkillRunRecovery` to event
  writes.
- Adds a focused reducer test file and migrates integration test setup.
- No persistence format migration and no new storage entities.

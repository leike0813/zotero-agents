## Why

SkillRunner run state is written through ten mutation entry points. Each
mutation decides whether to append an audit event, so the run record and event
history can drift. Transition rules are spread across callers and mutations.

## What Changes

- Add one write seam: `applySkillRunnerRunEvent(event)`.
- The reducer atomically updates the materialized run record, appends the
  audit event, and notifies subscribers.
- Route archive and delete lifecycle actions through `run.archived` and
  `run.deleted` events.
- Remove the public `appendSkillRunnerRunEvent` bypass.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-adapter`: SkillRunner run store uses one event write seam with a
  reducer preserving current transition semantics.
- `skillrunner-runkey-ssot`: Archive and delete lifecycle events remain
  runKey-scoped and preserve request identity invariants.

## Impact

- Removes mutation write exports from `skillRunnerRunStore`.
- Migrates run seam, apply seam, foreground continuation, settlement, session
  sync, task runtime, queue manager, UI harness, and tests to event writes.
- Adds a focused reducer test file.
- No persisted record schema change; event records remain compatible.

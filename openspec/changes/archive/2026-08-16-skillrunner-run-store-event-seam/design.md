## Context

`skillRunnerRunStore` exposes `createSkillRunnerRun`,
`updateSkillRunnerRunMessageCounts`, `attachSkillRunnerRequestId`,
`recordSkillRunnerProgress`, `recordSkillRunnerObserverFailure`,
`recordSkillRunnerObserverAttached`, `settleSkillRunnerRun`,
`updateSkillRunnerRunStateByRequest`, `updateSkillRunnerRunStateByRunKey`,
`updateSkillRunnerRunApplyState`, `updateSkillRunnerRunResult`,
`deleteSkillRunnerRunRecord`, `archiveSkillRunnerRunRecordByRequest`,
`archiveSkillRunnerRunRecordByRunKey`, `deleteSkillRunnerRunRecordsByBackend`,
and `appendSkillRunnerRunEvent`.

The store already persists an audit event log. Several mutations optionally
write events; others never do. The record is authoritative, but the two write
surfaces can diverge.

## Goals / Non-Goals

**Goals:**

- Give run state one write seam with one reducer.
- Preserve current terminal guards, request identity invariants, snapshot
  no-op semantics, apply failure behavior, and result merge behavior.
- Route archive/delete through the same event seam.
- Keep the persisted run record schema and event record schema unchanged.

**Non-Goals:**

- Full event sourcing with read-time projection.
- Changing SkillRunner provider protocol or task projection shape.
- Merging ACP run stores or workflow task persistence.
- Deleting run event history when a run is deleted.

## Decisions

### One apply seam with an atomic reducer

`applySkillRunnerRunEvent(event)` maps a discriminated event to a record
transition, persists the updated record, appends one audit event, and emits
the store change notification. Missing-run events return `null`, preserving
current caller behavior. Request identity conflicts keep current handling.

### Event catalog

The existing event catalog is kept and de-duplicated
(`sequence.step.settled`). New types:

- `run.message_counts_updated`
- `run.archived`
- `run.deleted`

`appendSkillRunnerRunEvent` is removed as a public bypass; the reducer is the
only audit event writer.

### Typed event payloads

`SkillRunnerRunEvent` is a discriminated union. Each variant carries only the
fields its reducer branch needs. Persistence serializes the variant to the
existing `SkillRunnerRunEventRecord` shape.

### Lifecycle events

`run.archived` writes `archivedAt` and keeps the record.
`run.deleted` deletes the record and its event history.
`deleteSkillRunnerRunRecordsByBackend` expands into one `run.deleted` event per
record.

## Risks / Trade-offs

- [Large caller migration] -> Source and test callers migrate to event writes
  in the same change; the reducer tests lock old semantics before migration.
- [Delete event retains history] -> This preserves current behavior; orphaned
  event history remains queryable by runKey.
- [Typed payloads are stricter] -> Callers can no longer attach arbitrary
  event payloads; reducer branches normalize the payload they require.

## Migration Plan

1. Add reducer tests for every event type and preserved transition semantics.
2. Implement `SkillRunnerRunEvent` and `applySkillRunnerRunEvent`.
3. Migrate source callers, then delete old mutation exports.
4. Migrate test setup to event writes and delete mutation-level assertions.
5. Update specs and run focused/full verification.

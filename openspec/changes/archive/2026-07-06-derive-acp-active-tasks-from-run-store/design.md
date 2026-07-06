## Context

ACP Skills has its own durable run store and active run index. Older Dashboard
paths still treat ACP workflow task rows as carrier records and patch their
status from ACP summaries. That carrier model creates a second state source and
can diverge when carrier rows are stale, missing, or restored after startup.

## Decisions

### ACP active projection is read-time derived

ACP active task rows will be materialized from `AcpSkillRunSummary` values
returned by `listAcpSkillRunSummaries({ activeOnly: true })`. The active set is
owned by the ACP run store and rebuilt during run hydration through the existing
active index maintenance.

Legacy ACP workflow task rows will be ignored by ACP active projection. They
are not fallback metadata and do not participate in sorting, visibility, state
mapping, or Host Bridge active handles.

### One projection seam feeds all active consumers

Dashboard home, toolbar popover, workspace attention, Dashboard ACP backend
rows, and Host Bridge active listing will share the same ACP summary-to-active
row semantics. Consumers may adapt the row shape for their own DTO, but they
must not duplicate ACP status classification or read ACP panel snapshots.

### Startup reconcile cleans legacy rows, not active state

Startup reconcile may normalize recoverable legacy ACP records and remove stale
carrier rows. It must not rebuild ACP active state by writing workflow task
rows. After startup, active visibility comes from hydrated ACP run summaries.

### SkillRunner remains separate

SkillRunner active projection continues to use `SkillRunnerRunStore`,
`listSkillRunnerRunProjections()`, and the existing recovery sweep. This change
does not merge ACP with SkillRunner recovery ownership.

## Risks

- Some Dashboard history counters may no longer count ACP terminal carrier rows.
  This is acceptable for this change because Dashboard home history totals are
  out of scope.
- Hidden code paths may still call taskRuntime updates for ACP request ids.
  Tests should guard that stale carrier rows are ignored even if such rows
  exist.

## Migration

No schema migration is required. Existing ACP carrier rows can remain until
cleanup paths remove them. New active reads ignore them.

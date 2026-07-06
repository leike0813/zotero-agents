## Why

ACP Skills active task state is currently split between ACP run records and
legacy workflow task rows. Dashboard home and toolbar popover can therefore
show stale or missing state after restarts or status transitions, especially
for actionable non-terminal states such as `waiting_user` and
`failed_retriable`.

## What Changes

- Treat ACP run store summaries as the only source for ACP active task
  projection.
- Derive Dashboard, popover, workspace attention, and Host Bridge active task
  rows from ACP active run summaries at read time.
- Ignore legacy ACP task rows for projection presence, status, and metadata.
  Legacy rows may only be cleaned up.
- Keep SkillRunner on its existing run-store projection and recovery sweep
  model.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: ACP active task projections are derived
  from ACP run store active summaries and are re-created after startup hydrate.
- `host-bridge-workflow-control`: Host Bridge active task listing uses
  ACP-derived active handles without depending on legacy ACP task rows.

## Impact

- Affects ACP run store startup reconcile, Dashboard active task projection,
  toolbar popover active list, workspace attention count, and Host Bridge
  workflow control reads.
- No database migration, dependency change, UI copy change, or Synthesis UI
  behavior change is required.

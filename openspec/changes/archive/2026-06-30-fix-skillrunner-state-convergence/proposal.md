## Why

SkillRunner frontend state can currently diverge from backend job truth in two
ways:

- `/v1/jobs/{request_id}` can report terminal `failed` while the plugin run
  workspace still shows the task as running.
- A request that fails before `request-ready` can remain stuck in local
  uploading/running projection even though it is not a recoverable foreground
  task.

Both cases violate the current SkillRunner state-machine SSOT: backend terminal
and waiting states observed through the jobs endpoint must converge through the
local run store, task runtime, and dashboard history; pre-ready submit/upload
failures must fail visibly.

## What Changes

- Treat `SkillRunnerRunStore` as the local SSOT for jobs endpoint observations
  from RunDialog/workspace status sync.
- Write backend `failed`, `canceled`, `succeeded`, `waiting_user`, and
  `waiting_auth` observations through the same management-status convergence
  path used by explicit actions.
- Classify failures before `request-ready` as visible local failures rather
  than recoverable observer detachments.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `provider-adapter`: SkillRunner pre-ready failure and terminal/waiting
  ownership.
- `task-dashboard-skillrunner-observe`: dashboard/workspace convergence from
  jobs endpoint observations.

## Impact

- Affected code: job queue manager, recoverable state handling, and run dialog
  synchronization.
- Affected tests: single-result integration pre-ready failure, job queue
  pre-ready failure, and run-dialog status-convergence coverage.
- Operator impact: stuck SkillRunner rows should converge to visible failed,
  canceled, succeeded, or waiting projections without requiring plugin restart.

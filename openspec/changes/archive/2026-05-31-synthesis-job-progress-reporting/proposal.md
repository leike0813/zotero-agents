## Why

Synthesis Workbench now exposes background jobs in the statusbar and task
popover, but most rows can only show indeterminate progress because worker
state is limited to queue status. Users need a durable progress protocol that
reports real counts or explicit phases without inventing percentages.

## What Changes

- Promote `synt_job_state` into the durable Synthesis job progress source of
  truth.
- Add additive job progress fields for run identity, source, label, phase,
  message, heartbeat, started/completed timestamps, total count, progress mode,
  and structured progress metadata.
- Add repository and service APIs for reporting, completing, failing, listing,
  and expiring job progress.
- Teach budgeted Synthesis workers to report determinate progress when a
  bounded count is known, and phase progress when the work is staged but not
  item-countable.
- Feed reported progress into existing `maintenance.backgroundJobs` so the
  current statusbar and popover can show real progress without a UI rewrite.

## Capabilities

### New Capabilities

- `synthesis-job-progress-reporting`: Durable Synthesis background job progress
  protocol, progress algorithms, and Workbench read-model projection.

### Modified Capabilities

- `synthesis-incremental-update-triggers`: Budgeted update workers now report
  durable active progress while processing dirty events.
- `synthesis-git-sync`: Git Sync now reports phase progress for UI-visible
  sync runs.
- `synthesis-tab-ui`: Workbench background job rows prefer backend progress
  over queue-state fallback rows.

## Impact

- Affected modules: Synthesis repository, Synthesis service workers, Git Sync,
  UI model snapshot assembly, and focused Synthesis tests.
- Additive SQLite schema changes only; no automatic migration from JSON assets
  and no deletion of `data/synthesis`.
- No new npm dependencies and no changes to the `literature-digest` submodule.

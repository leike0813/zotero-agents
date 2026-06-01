## Why

Synthesis background work currently has multiple competing sources of truth:
dirty events, job progress rows, startup reconcile meta state, and UI/debug
projection fallbacks. This has repeatedly produced stuck queued/running rows,
duplicate job projection, and unclear ownership between producers, workers,
and the Workbench.

## What Changes

- **BREAKING** Replace dirty-event/job-progress governance with a unified
  WorkItem model as the only durable runtime work truth.
- **BREAKING** Replace Workbench `maintenance.updateQueue` and
  `maintenance.backgroundJobs` with `maintenance.workQueue` and
  `maintenance.workItems`.
- **BREAKING** Replace Host Bridge `debug.synthesis.queue.*` and
  `debug.synthesis.jobs.*` with `debug.synthesis.work.*`.
- Add repository-backed `synt_work_item`, `synt_work_run`, and
  `synt_work_queue_meta` tables.
- Migrate legacy `synt_dirty_event` and `synt_job_state` rows into WorkItems
  and runs, then stop using those tables as runtime truth.
- Add a static Work Registry declaring owner worker, allowed scope, coalescing
  key, priority/order, basis policy, UI label, and debug command for each
  Synthesis work type.
- Require all producers to enqueue work through the registry and all workers
  to claim work by owner.

## Capabilities

### New Capabilities

- `synthesis-work-governance`: Unified Synthesis WorkItem, run, queue,
  ownership, lifecycle, and projection contract.

### Modified Capabilities

- `synthesis-incremental-update-triggers`: Replace dirty-event driven wording
  with WorkItem-driven triggering and coalescing.
- `synthesis-job-progress-reporting`: Replace standalone job progress rows
  with WorkItem run progress.
- `synthesis-workbench-ui`: Replace background job/update queue UI contract
  with WorkItem projection.
- `host-bridge-debug-capabilities`: Replace queue/jobs debug commands with
  work debug commands.
- `synthesis-literature-registry-citation-graph`: Align registry, graph,
  related-items, metrics, and freshness workers with WorkItem ownership.
- `synthesis-persistence-performance`: Add indexes and budget expectations for
  WorkItem claim, retry, projection, and stale cleanup paths.
- `synthesis-layer-doc-system`: Require docs to define WorkItem ownership and
  lifecycle when worker/queue behavior changes.

## Impact

- Repository schema and migrations.
- Synthesis service worker entrypoints and maintenance drain.
- Workbench snapshot model and rendering.
- Host Bridge capability registry and CLI-facing debug semantics.
- Existing focused tests for repository foundation, update events, graph
  workers, performance, and invariant guards.

## Overview

Synthesis work will use a single durable model:

- `WorkItem` is the unit of requested background work and the only runtime
  work truth.
- `WorkRun` records one execution attempt for a WorkItem.
- Trigger events are inputs to `enqueueSynthesisWork`; they are not durable
  primary state.
- Workbench and debug read the same WorkItem projection.

## Data Model

`synt_work_item` replaces `synt_dirty_event` as the active queue:

- `work_id`: deterministic coalescing key for active work.
- `work_type`: registry key such as `paper_registry_incremental`.
- `owner_worker`: registry-declared worker owner.
- `library_id`, `scope_kind`, `scope_ref`.
- `status`: `queued`, `running`, `waiting`, `completed`,
  `failed_retryable`, `failed_permanent`, `superseded`, `skipped`.
- `priority`, `coalesced_count`, `attempt_count`, `next_run_at`.
- `basis_kind`, `basis_value` for guarded derived work.
- `progress_mode`, `processed_count`, `total_count`, `failed_count`,
  `message`, `diagnostics_json`.
- `created_at`, `updated_at`, `completed_at`, `heartbeat_at`.

`synt_work_run` replaces `synt_job_state` for execution history:

- `run_id`, `work_id`, `work_type`, `owner_worker`.
- attempt number, status, phase/progress fields, diagnostics, heartbeat,
  started/completed timestamps.

`synt_work_queue_meta` stores only global pause/resume and last drain summary.
It is not a job row.

## Work Registry

The service owns a static registry of Synthesis work types. Each entry defines:

- `work_type`
- `owner_worker`
- allowed `scope_kind`
- coalescing key builder
- priority and drain order
- auto-drain flag
- basis policy: none, registry epoch, graph hash, layout key
- Workbench/debug label and default command

Workers may not hand-filter arbitrary event types. They call
`claimNextSynthesisWork(ownerWorker)` and receive only WorkItems owned by that
worker.

## Migration

Repository initialization migrates legacy rows if old tables exist:

- Dirty event rows become WorkItems by registry mapping.
- Job progress rows become WorkRuns and, when no matching WorkItem exists,
  terminal or retryable WorkItems.
- Unmapped legacy rows become `failed_permanent` WorkItems with
  `legacy_work_unmapped`.
- After successful migration, old runtime tables are dropped and removed from
  table lists/reset/debug table counts.

## Runtime Flow

1. Producer calls `enqueueSynthesisWork(signal)`.
2. Registry validates scope and computes `work_id`.
3. Existing active compatible WorkItem is coalesced; terminal WorkItems are not
   mutated back to queued unless the registry says the signal opens a new
   generation.
4. Auto-drain schedules one local drain if not paused.
5. Drain claims WorkItems in registry priority order.
6. Worker creates a WorkRun, heartbeats, updates item progress, and finalizes
   both item and run.
7. Basis-guarded work rechecks basis in final promotion and marks stale work
   `superseded`.

## UI and Debug

Workbench exposes:

- `maintenance.workQueue`: aggregate counts, pause state, allowed actions.
- `maintenance.workItems`: bounded ordered work rows.

Host Bridge exposes:

- `debug.synthesis.work.list`
- `debug.synthesis.work.run`
- `debug.synthesis.work.control`
- `debug.synthesis.work.clear`

Old queue/jobs APIs are removed from the formal contract.

## Failure Policy

- Non-paused queued WorkItems older than the stale threshold must show a
  diagnostic with owner and command.
- Stale running WorkItems/runs are marked `failed_retryable` or `superseded`
  before projection.
- Work without registry owner is `failed_permanent` because it is a schema
  governance error.
- Read paths may reconcile stale runtime rows but must not enqueue new work.

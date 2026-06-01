## Summary

Fix Synthesis background work observability and draining. Workbench must not count
the update queue aggregate as a second queued job beside concrete dirty events,
and internally generated `related_items_sync_dirty` events must be automatically
drained or moved to retryable failure.

## Problem

Current UI projection mixes queue-level status and event-level work in one
background job list. A single queued dirty event can appear as both
`Synthesis update queue` and a concrete dirty event row. Separately,
`debug.synthesis.jobs.list` only reports durable job progress rows, so it can
return empty while the Workbench shows queued work. Finally,
`related_items_sync_dirty` can be queued by Registry/graph promotion without a
reliable background consumer.

## Goals

- Treat the update queue aggregate as summary state, not a background job row.
- Align debug jobs output with Workbench background job projection.
- Add bounded automatic drain for dirty events, including related-items sync.
- Ensure related-items sync reports durable job progress.
- Document dirty event lifecycle, stale queued diagnostics, and UI/debug
  projection boundaries.

## Non-Goals

- Do not clear existing user queue state as part of the migration.
- Do not change `debug.synthesis.queue.list`; it remains the dirty-event list.
- Do not introduce external queues, distributed locks, or new dependencies.

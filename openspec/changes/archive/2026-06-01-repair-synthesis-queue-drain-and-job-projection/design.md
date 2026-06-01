## Decisions

### Queue Aggregate Is Summary Only

`Synthesis update queue` is a derived aggregate from dirty event counts. It must
remain visible through `maintenance.updateQueue` and
`maintenance.summary.pendingDirtyCount`, but it is not a concrete job and must
not be added to `maintenance.backgroundJobs.rows`.

### Debug Jobs Use UI Projection

`debug.synthesis.jobs.list` returns the same bounded background job projection
that the Workbench uses. Callers that need raw durable progress rows can pass
`includeRawRows: true`, which adds `progressRows` without replacing `rows`.

### Automatic Dirty Event Drain

The service schedules one asynchronous bounded maintenance drain when dirty work
is recorded, retried, resumed, or observed at service startup. The scheduler is
single-instance, respects pause, and runs the existing worker paths in this
order:

1. paper registry incremental
2. citation graph structure
3. citation graph complex metrics
4. related-items sync
5. topic freshness

The scheduler is enabled for the default Zotero-backed service and can be
controlled in tests through service options.

### Related-Items Sync Progress

`runRelatedItemsSyncWorker()` reports durable progress under
`synthesis:related-items-sync-worker`. If a Zotero host is unavailable, queued
related-items events become `failed_retryable` with diagnostics instead of
remaining queued indefinitely.

### Stale Queued Guard

Queued dirty events older than ten minutes while the queue is not paused receive
a transient `dirty_event_stale_queued` diagnostic in UI/debug projections. This
does not overwrite durable event state; actual worker failures still transition
to retryable or permanent failure.

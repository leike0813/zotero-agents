## MODIFIED Requirements

### Requirement: Synthesis jobs SHALL expose durable progress state

Synthesis background jobs SHALL persist their latest progress in the Synthesis
SQLite repository so Workbench snapshots can observe active work without
reading debug profiler data or transient UI state.

#### Scenario: Previous running job heartbeat is stale

- **WHEN** a durable job progress row is still `running`
- **AND** its heartbeat is older than the stale progress threshold
- **THEN** Workbench/debug projection SHALL NOT continue to show it as running
- **AND** the row SHALL be marked retryable or superseded before projection.

### Requirement: Workbench job projection SHALL prefer precise backend progress

Workbench background job projection SHALL prefer durable job progress rows over
queue fallback rows for the same source of work.

#### Scenario: Backend progress and queue fallback both exist

- **WHEN** a backend progress row and a queue fallback row describe the same
  active job
- **THEN** the Workbench snapshot SHALL present the backend progress row as the
  primary job
- **AND** the fallback row SHALL NOT overwrite determinate progress.

#### Scenario: Queue aggregate and dirty event both exist

- **WHEN** queued dirty events make the update queue aggregate state `queued`
- **THEN** Workbench SHALL expose the aggregate through maintenance summary and
  queue state
- **AND** background job counts SHALL be based on concrete dirty-event or
  progress rows, not the aggregate.

#### Scenario: Startup reconcile generated work has settled

- **WHEN** startup reconcile previously generated
  `startup_reconcile_detected_dirty_items`
- **AND** concrete dirty-event rows own the generated work
- **THEN** startup reconcile SHALL NOT be projected as a queued background job
- **AND** after those generated dirty events leave active states, the stored
  startup reconcile detector state SHALL reconcile back to `ready`.

### Requirement: Debug jobs SHALL match Workbench job projection

Synthesis debug job listing SHALL use the same background job projection as
Workbench by default.

#### Scenario: Dirty event exists without durable progress row

- **WHEN** `debug.synthesis.jobs.list` is called
- **AND** a dirty event is queued
- **THEN** the returned `rows` SHALL include the dirty-event background job row
  that Workbench would show.

#### Scenario: Raw progress rows are requested

- **WHEN** `debug.synthesis.jobs.list` is called with `includeRawRows: true`
- **THEN** the response SHALL include raw durable progress rows as
  `progressRows`
- **AND** `rows` SHALL remain the Workbench-compatible background job
  projection.

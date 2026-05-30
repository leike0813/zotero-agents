## ADDED Requirements

### Requirement: Synthesis jobs SHALL expose durable progress state

Synthesis background jobs SHALL persist their latest progress in the Synthesis
SQLite repository so Workbench snapshots can observe active work without
reading debug profiler data or transient UI state.

#### Scenario: Running job reports determinate progress

- **WHEN** a Synthesis job reports a known `processed_count` and `total_count`
- **THEN** the repository SHALL persist a running job state with determinate
  progress
- **AND** Workbench `maintenance.backgroundJobs` SHALL expose `current`,
  `total`, and `percent` derived from those counts.

#### Scenario: Running job reports phase progress

- **WHEN** a Synthesis job reports a bounded phase index and phase total
- **THEN** Workbench `maintenance.backgroundJobs` SHALL expose determinate
  phase progress
- **AND** the row detail SHALL identify the current phase label.

#### Scenario: Running job has no computable progress

- **WHEN** a Synthesis job is active but no total or phase total is available
- **THEN** Workbench `maintenance.backgroundJobs` SHALL expose indeterminate
  progress
- **AND** it SHALL NOT invent an item-level percentage.

### Requirement: Synthesis job progress SHALL have explicit lifecycle helpers

The Synthesis repository and service SHALL provide typed helpers for starting,
updating, completing, failing, listing, and expiring progress rows.

#### Scenario: Job completes

- **WHEN** a running job completes successfully
- **THEN** its latest progress state SHALL record a completed status,
  completion timestamp, final processed/skipped/failed counts, and diagnostics.

#### Scenario: Job fails

- **WHEN** a running job fails
- **THEN** its latest progress state SHALL record a failed status,
  completion timestamp, diagnostics, and last known progress.

#### Scenario: Running job becomes stale

- **WHEN** a running job heartbeat is older than the configured stale cutoff
- **THEN** stale progress cleanup SHALL stop presenting the job as running
- **AND** the row SHALL be observable as waiting or failed according to the
  cleanup policy.

### Requirement: Workers SHALL report real progress where bounded work is known

Budgeted Synthesis workers SHALL report determinate progress only when their
bounded work set is known before or during execution.

#### Scenario: Dirty event worker uses bounded pending events

- **WHEN** a dirty event worker selects pending events with a batch limit
- **THEN** it SHALL report `total_count` as the selected event count bounded by
  the batch limit
- **AND** it SHALL update `processed_count` after each event is processed.

#### Scenario: Startup reconcile discovers fingerprint count

- **WHEN** startup reconcile finishes loading Zotero metadata fingerprints
- **THEN** it SHALL switch from indeterminate progress to determinate scanning
  progress based on the fingerprint count.

#### Scenario: Literature registry rebuild lacks item callbacks

- **WHEN** literature registry rebuild runs without paper/reference progress
  callbacks
- **THEN** it SHALL report phase progress
- **AND** it SHALL NOT claim paper-level progress.

#### Scenario: Git Sync runs staged work

- **WHEN** Git Sync runs lock, export, copy, fetch, merge, validate, push,
  import, and cleanup phases
- **THEN** it SHALL report phase progress for the current phase
- **AND** conflict or failure rows SHALL retain the last known phase.

### Requirement: Workbench job projection SHALL prefer precise backend progress

Workbench background job projection SHALL prefer durable job progress rows over
queue aggregate fallback rows for the same source of work.

#### Scenario: Backend progress and queue fallback both exist

- **WHEN** a backend progress row and a queue fallback row describe the same
  active job
- **THEN** the Workbench snapshot SHALL present the backend progress row as the
  primary job
- **AND** the fallback row SHALL NOT overwrite determinate progress.

#### Scenario: Frontend action is awaiting backend progress

- **WHEN** a Workbench action has been submitted but backend progress has not
  appeared yet
- **THEN** the frontend in-flight action MAY remain visible as submitted or
  running
- **AND** once matching backend progress exists, the backend row SHALL be used
  for progress details.

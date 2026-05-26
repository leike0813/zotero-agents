# synthesis-incremental-update-triggers Specification

## Purpose
TBD - created by archiving change redesign-synthesis-incremental-update-triggers. Update Purpose after archive.
## Requirements
### Requirement: Synthesis read paths are side-effect free

Synthesis read paths SHALL NOT start rebuilds, enqueue background jobs, schedule
retries, write projections, or write durable job state.

#### Scenario: Stale projection is read

- **WHEN** a Synthesis read method observes stale or missing projection state
- **THEN** it SHALL return bounded latest-usable data or diagnostics
- **AND** it SHALL NOT enqueue a rebuild job.

#### Scenario: Read hint is recorded

- **WHEN** a read path records that stale data was observed
- **THEN** the hint SHALL remain process-local
- **AND** it SHALL NOT write durable state or start a worker.

### Requirement: Synthesis updates are event driven

Automatic Synthesis maintenance SHALL be driven by durable update events and
dirty scopes rather than by read-time discovery.

#### Scenario: Workflow apply changes paper artifacts

- **WHEN** a workflow apply hook changes paper-level artifacts
- **THEN** it SHALL record scoped dirty events
- **AND** downstream workers SHALL process those scopes under budget.

#### Scenario: Multiple dirty events target the same scope

- **WHEN** multiple dirty events target the same paper, work, topic, or graph
  scope
- **THEN** the dirty queue SHALL coalesce them before worker execution.

### Requirement: Startup reconcile is lightweight

Startup reconcile SHALL detect missed Zotero item changes without performing a
full rebuild.

#### Scenario: Plugin starts with existing registry state

- **WHEN** startup reconcile runs
- **THEN** it SHALL compare Zotero item identity and lightweight metadata
  fingerprints with registry facets
- **AND** it SHALL record dirty events for differences
- **AND** it SHALL NOT parse large artifact files or rebuild graph projections.

#### Scenario: Startup reconcile reports status

- **WHEN** startup reconcile finishes or fails
- **THEN** UI-visible status SHALL report checking, queued, ready,
  failed_retryable, or failed_permanent state.

### Requirement: Background workers are budgeted and pausable

Synthesis background workers SHALL process dirty scopes through bounded,
single-worker queues.

#### Scenario: Worker budget is exhausted

- **WHEN** a worker reaches its batch or time budget
- **THEN** remaining dirty scopes SHALL stay queued
- **AND** UI/job state SHALL remain observable.

#### Scenario: Synthesis updates are paused

- **WHEN** automatic Synthesis updates are paused
- **THEN** new dirty events SHALL be recorded
- **AND** background workers SHALL NOT process them until resumed.

### Requirement: Full rebuilds are explicit repair actions

Full Synthesis rebuilds SHALL be explicit user or host commands and SHALL NOT be
normal read-path behavior.

#### Scenario: Full rebuild is needed

- **WHEN** incremental state cannot determine a safe affected scope
- **THEN** Synthesis SHALL mark the broader scope stale
- **AND** expose an explicit repair or rebuild command.


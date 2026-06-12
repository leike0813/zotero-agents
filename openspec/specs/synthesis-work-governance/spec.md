## Purpose

Synthesis runtime work is represented by explicit operation rows, not background queues.

## Requirements

### Requirement: Explicit operation is the only runtime work record
Synthesis runtime work SHALL be represented by explicit operation records created by a user action, workflow apply, protected import/export/reset, or scoped debug command.

#### Scenario: Operation is listed
- **WHEN** Workbench or Host Bridge lists Synthesis operations
- **THEN** the result SHALL contain explicit operations only
- **AND** it SHALL NOT include WorkItems, WorkRuns, dirty events, or queue aggregates.

### Requirement: Operations are not claimable worker queue items
Synthesis operation records SHALL NOT support owner-worker claiming, queue drain, pause/resume queue state, retry scheduling, or coalescing.

#### Scenario: Operation needs continuation
- **WHEN** an explicit operation cannot finish within its slice budget
- **THEN** it SHALL store progress and return a continuation status
- **AND** continuation SHALL require an explicit caller action or operation-specific controlled loop, not a global queue drain.

### Requirement: Startup SHALL cancel stale Synthesis runtime operations

Synthesis startup reconciliation SHALL cancel persisted running operation rows from a prior plugin process before those rows are surfaced as active Workbench jobs.

#### Scenario: Running operation left by previous session

- **GIVEN** a Synthesis operation row is persisted with status `running`
- **WHEN** the plugin performs startup runtime work reconciliation
- **THEN** the operation SHALL be updated to `canceled`
- **AND** its diagnostics SHALL include `synthesis_operation_stale_after_restart`
- **AND** Workbench background jobs SHALL NOT count it as running.

#### Scenario: Runtime stale guard remains available

- **GIVEN** a Synthesis operation row remains `running` during the current session
- **WHEN** it exceeds the runtime stale threshold
- **THEN** the existing runtime stale guard SHALL cancel it with the same stale-after-restart diagnostic.

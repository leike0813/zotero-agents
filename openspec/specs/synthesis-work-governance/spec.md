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

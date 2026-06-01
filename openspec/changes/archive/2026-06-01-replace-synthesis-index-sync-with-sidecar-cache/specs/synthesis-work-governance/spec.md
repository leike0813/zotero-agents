## ADDED Requirements

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

## REMOVED Requirements

### Requirement: WorkItem is the only durable runtime work truth
**Reason**: WorkItems are the old durable background queue abstraction.
**Migration**: Use explicit operation rows.

### Requirement: Work Registry declares ownership
**Reason**: Worker ownership is not part of the hard-cut model.
**Migration**: Operation type and caller scope replace owner-worker routing.

### Requirement: Workers claim only owned WorkItems
**Reason**: Claimable workers are removed.
**Migration**: Explicit operations run under the initiating command.

### Requirement: WorkRun records execution attempts
**Reason**: WorkRun history belongs to the removed worker queue model.
**Migration**: Store bounded progress and diagnostics on operation rows.

### Requirement: Workbench and debug read the same work projection
**Reason**: Work projection is replaced by explicit operation listing.
**Migration**: Workbench and debug read the same operation list.

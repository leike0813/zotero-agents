## ADDED Requirements

### Requirement: Sidecar schema is cache and decision oriented
Synthesis persistence SHALL optimize sidecar projection reads, explicit decision writes, and explicit operation progress rather than queue claiming or worker scheduling.

#### Scenario: Repository initializes after hard cut
- **WHEN** the repository initializes
- **THEN** it SHALL create sidecar cache, decision, and operation tables
- **AND** it MAY drop old queue, job, WorkItem, WorkRun, and Registry rebuild tables.

### Requirement: Explicit operations are bounded
Explicit cache refresh and review operations SHALL use bounded reads, bounded writes, and progress checkpoints.

#### Scenario: Operation reaches slice budget
- **WHEN** an operation reaches its configured time or count budget
- **THEN** it SHALL store progress and return control to the caller
- **AND** it SHALL NOT block Zotero UI waiting for a global drain to finish.

## REMOVED Requirements

### Requirement: Bulk drift uses documented relaxed thresholds
**Reason**: Startup drift classification is removed.
**Migration**: Direct reads discover current state; explicit inspect/refresh can report bounded diagnostics.

### Requirement: Work queue persistence is indexed and bounded
**Reason**: Work queues are removed.
**Migration**: Index operation listing and sidecar cache queries.

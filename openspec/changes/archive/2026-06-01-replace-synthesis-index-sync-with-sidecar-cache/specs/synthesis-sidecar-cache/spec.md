## ADDED Requirements

### Requirement: Zotero Library facts remain external source of truth
Synthesis SHALL NOT store an automatically synchronized copy of Zotero Library item existence, metadata, tags, collections, notes, attachments, or native relations as authoritative facts.

#### Scenario: Correctness-sensitive read needs library facts
- **WHEN** a topic source check, workflow preparation, or host capability needs current Zotero item state
- **THEN** it SHALL read Zotero Library or a direct host-library facade
- **AND** it SHALL NOT treat sidecar cache rows as the source of truth.

### Requirement: Sidecar persistence stores cache projections and approved decisions only
Synthesis persistence SHALL store regenerable cache projections and explicit user-approved reference, binding, merge, dedupe, and related-items decisions.

#### Scenario: Cache projection is stale
- **WHEN** a sidecar projection basis no longer matches the checked source
- **THEN** the system SHALL report stale cache state
- **AND** it SHALL NOT mark Zotero Library, workflow artifacts, or topic artifacts stale.

### Requirement: Sidecar writes use explicit bounded paths
Synthesis sidecar writes SHALL occur only through workflow apply sync, explicit cache refresh, explicit review action, explicit import/export/reset, or scoped debug command.

#### Scenario: Workbench snapshot is read
- **WHEN** Workbench builds a snapshot
- **THEN** it SHALL NOT start cache refresh, reconcile Zotero Library, enqueue work, or mutate sidecar rows.

### Requirement: Explicit operations replace background work queues
Long-running Synthesis work SHALL be represented as explicit operation records, not dirty events, WorkItems, WorkRuns, worker claims, or queue drains.

#### Scenario: Graph cache refresh starts
- **WHEN** a user or debug command starts citation graph cache refresh
- **THEN** an explicit operation row SHALL record scope, status, progress, diagnostics, and timestamps
- **AND** no claimable background queue row SHALL be created.

### Requirement: Destructive sidecar schema cutover is allowed
The implementation SHALL allow old Synthesis queue, job, WorkItem, WorkRun, and Registry rebuild tables to be dropped during this hard cut.

#### Scenario: Old queue tables exist
- **WHEN** the new sidecar schema initializes
- **THEN** old synchronization tables MAY be removed without migration
- **AND** startup SHALL NOT replay or import their rows.

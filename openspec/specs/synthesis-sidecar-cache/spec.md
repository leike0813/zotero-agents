## Purpose

Synthesis stores regenerable sidecar cache projections and explicit approved decisions while Zotero Library remains source of truth.
## Requirements
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

### Requirement: Artifact sidecar stores artifact facts only
Synthesis artifact sidecar rows SHALL be keyed by `source_ref = <libraryId>:<itemKey>` and SHALL store only artifact existence, locator, hash/fingerprint, diagnostics, and scan timing.

#### Scenario: Artifact scan observes a Zotero item
- **WHEN** reference sidecar refresh scans a Zotero source item
- **THEN** it MAY update digest, references, and citation-analysis artifact sidecar fields
- **AND** it SHALL NOT persist Zotero title, creators, year, tags, collections, item type, or deletion state as Synthesis-owned library facts.

### Requirement: Reference sidecar refresh is two-stage
Reference sidecar refresh SHALL scan artifact sidecar state and diff references artifact hashes before extracting and reconciling changed references artifacts.

#### Scenario: Refresh completes successfully
- **WHEN** explicit Reference Sidecar refresh finishes
- **THEN** `reference-sidecar:library` SHALL be marked ready in cache basis
- **AND** graph-affecting changes MAY trigger a separate visible Citation Graph cache incremental refresh
- **AND** the refresh SHALL NOT rebuild citation graph cache rows inside the sidecar transaction.

#### Scenario: Refresh fails after previous success
- **WHEN** explicit Reference Sidecar refresh fails
- **AND** a previous `reference-sidecar:library` cache basis is ready
- **THEN** the ready cache basis SHALL be preserved
- **AND** the failure SHALL be represented as an operation failure, not as cache data deletion.

### Requirement: Sidecar writes use explicit bounded paths
Synthesis sidecar writes SHALL occur only through workflow apply sync, explicit cache refresh, explicit review action, explicit import/export/reset, or scoped debug command.

#### Scenario: Workbench snapshot is read
- **WHEN** Workbench builds a snapshot
- **THEN** it SHALL NOT start cache refresh, reconcile Zotero Library, enqueue work, or mutate sidecar rows.

### Requirement: Explicit operations replace background work queues
Long-running Synthesis work SHALL be represented as explicit operation records, not dirty events, WorkItems, WorkRuns, worker claims, or queue drains.

#### Scenario: Graph cache refresh starts
- **WHEN** a user, workflow, sidecar refresh, advanced matching, or debug command starts citation graph cache refresh
- **THEN** an explicit operation row SHALL record scope, status, progress, diagnostics, and timestamps
- **AND** no claimable background queue row SHALL be created.

### Requirement: Destructive sidecar schema cutover is allowed
The implementation SHALL allow old Synthesis queue, job, WorkItem, WorkRun, Registry rebuild, and library-index projection tables to be dropped during this hard cut.

#### Scenario: Old queue tables exist
- **WHEN** the new sidecar schema initializes
- **THEN** old synchronization tables MAY be removed without migration
- **AND** startup SHALL NOT replay or import their rows.

### Requirement: Sidecar readiness comes from cache basis
Reference Sidecar data readiness SHALL be derived from `synt_cache_basis`, not from legacy state or projection files.

The cache-basis state set SHALL be limited to `missing`, `refreshing`, `ready`, `stale`, and `failed`; absent or unrecognized values SHALL be treated as `missing`.

#### Scenario: Legacy state file says failed
- **WHEN** `reference-sidecar-state.json` exists with a failed state
- **AND** `reference-sidecar:library` cache basis is ready
- **THEN** Workbench and diagnostics SHALL treat Reference Sidecar data as ready
- **AND** they SHALL NOT create a failed Reference Sidecar job from the legacy file.

## Purpose

Synthesis progress reporting belongs to explicit operations and bounded workflow apply sidecar sync.
## Requirements
### Requirement: Explicit operations report progress
Synthesis SHALL report progress only for explicit operations and workflow apply sidecar sync.

#### Scenario: Cache refresh reports progress
- **WHEN** an explicit cache refresh processes references or graph rows
- **THEN** the operation SHALL expose status, phase, processed count, optional total count, diagnostics, and updated timestamp.

### Requirement: Completed operation history is bounded
Synthesis SHALL keep operation history bounded by limit, age, or explicit clear behavior.

#### Scenario: Workbench lists recent operations
- **WHEN** Workbench requests operation rows
- **THEN** the repository SHALL return bounded rows
- **AND** it SHALL NOT scan or project legacy job state.

### Requirement: Explicit operation progress is the only progress source for sidecar work
Reference Sidecar refresh and Citation Graph cache rebuild SHALL report progress through `synt_operation` rows.

#### Scenario: Operation completes
- **WHEN** an explicit sidecar or graph cache operation completes
- **THEN** its operation row SHALL become terminal
- **AND** terminal operation status SHALL NOT be used as cache readiness.

#### Scenario: Operation is running
- **WHEN** Workbench polls progress
- **THEN** progress SHALL come from the matching running operation row
- **AND** it SHALL NOT be inferred from cache basis or legacy state files.

### Requirement: Advanced matching reports explicit progress
Advanced Reference Matching SHALL report separate progress counters for binding and external dedupe work.

#### Scenario: External dedupe pass runs
- **WHEN** Advanced Reference Matching processes canonical dedupe candidates
- **THEN** progress diagnostics SHALL include canonical counts, redirect counts, proposal counts, and fuzzy budget diagnostics when applicable.

### Requirement: Workbench progress updates chrome only
Synthesis Workbench progress reporting SHALL update operation chrome without refreshing content surfaces.

#### Scenario: Long-running operation reports progress
- **WHEN** a Synthesis operation emits progress
- **THEN** the host SHALL send a chrome update containing operation/job state
- **AND** it SHALL NOT send a full snapshot or reload the active surface unless the operation completes and invalidates that surface.

### Requirement: Advanced Matching SHALL Report Cluster Dedupe Counters
Advanced Reference Matching progress SHALL report production cluster dedupe
counters during the external dedupe phase.

#### Scenario: Cluster external dedupe completes
- **WHEN** Advanced Reference Matching finishes external dedupe
- **THEN** diagnostics SHALL include canonical candidates, clusters, edges,
  redirect actions, review actions, weak records, excluded records, extension
  risk edges, and rejected proposals preserved.

### Requirement: Incremental graph refresh reports progress as a real operation

Incremental Citation Graph cache refresh SHALL create a visible operation row with progress and diagnostics.

#### Scenario: Statusbar shows graph incremental refresh

- **WHEN** graph incremental refresh starts
- **THEN** Workbench status surfaces SHALL be able to display `Citation graph cache incremental refresh`.


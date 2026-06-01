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


## ADDED Requirements

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

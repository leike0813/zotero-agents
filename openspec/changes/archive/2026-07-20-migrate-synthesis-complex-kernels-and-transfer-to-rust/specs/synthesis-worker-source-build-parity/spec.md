## ADDED Requirements

### Requirement: Worker audit surfaces SHALL cover fourteen Rust operations
Source fingerprinting, build fingerprinting, runtime freshness, operation inventory, smoke tests, compressed-size inventory, lockfile identity, licenses, and provenance SHALL cover the complete fourteen-operation Rust candidate.

#### Scenario: Candidate is packaged
- **WHEN** a native worker candidate is assembled
- **THEN** undeclared, stale, missing, duplicate, or source/build-divergent operation artifacts SHALL fail the build
- **AND** compressed candidate size SHALL remain below 15 MiB.

### Requirement: Migrated Node worker fixtures SHALL be removed
Node source and compiled worker parity fixtures SHALL remain only for the R6 Citation Graph layout kernel; matcher, Topic Structured Artifact, and Citation Graph Build worker fixtures and compute branches SHALL be absent.

#### Scenario: Worker sources are inspected after R5
- **WHEN** static parity checks enumerate Node worker operations
- **THEN** no migrated R5 operation SHALL be present
- **AND** the remaining Node worker surface SHALL be limited to layout.

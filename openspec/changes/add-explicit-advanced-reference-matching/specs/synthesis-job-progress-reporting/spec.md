## ADDED Requirements

### Requirement: Advanced matching reports explicit progress
Advanced reference matching SHALL report progress through `synt_operation`.

#### Scenario: Advanced matching runs
- **WHEN** `runAdvancedReferenceMatchingNow` processes references
- **THEN** progress SHALL report indexed papers, processed references, auto-accepted matches, proposals created, and rejected proposals preserved.

#### Scenario: Advanced matching fails
- **WHEN** the operation fails
- **THEN** failure SHALL be represented as an operation diagnostic
- **AND** existing accepted facts SHALL remain readable.


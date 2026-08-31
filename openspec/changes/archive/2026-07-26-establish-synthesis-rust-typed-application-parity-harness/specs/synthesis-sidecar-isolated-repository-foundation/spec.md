## ADDED Requirements

### Requirement: Rust repository SHALL expose bounded typed application rows

The Rust repository SHALL expose strict typed CRUD for cache-basis rows, complete operation rows, Topic state rows, and Topic projection rows over the unchanged schema. Read methods SHALL require explicit bounds and deterministic order, and write methods SHALL preserve short transaction and JavaScript-safe normalization rules.

#### Scenario: Application ports read persisted state
- **WHEN** Workbench or Topic requests its bounded repository inputs
- **THEN** the adapter returns complete typed rows without application projection, suppression, lifecycle, or commit policy
- **AND** all pre-existing table and index definitions remain unchanged

### Requirement: Generic synthetic application state SHALL not be persisted

The repository SHALL NOT expose or persist `application:<kind>` cache-basis records or an `ApplicationState` abstraction as evidence of domain application execution.

#### Scenario: Typed application sequence completes
- **WHEN** Workbench and Topic cases are executed
- **THEN** every write belongs to an existing cache, operation, Topic state, or Topic projection contract
- **AND** no synthetic application-kind row appears in the 51-table snapshot

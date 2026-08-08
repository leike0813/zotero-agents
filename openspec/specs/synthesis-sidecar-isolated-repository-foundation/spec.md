# synthesis-sidecar-isolated-repository-foundation Specification

## Purpose

Define the isolated Rust repository aggregates and transactional fault behavior required by the final application cluster.

## Requirements

### Requirement: Rust repository SHALL expose typed final R7 aggregates
The Rust repository SHALL provide bounded typed reads, complete Knowledge capture/replacement, Durable capture/import/apply/receipt operations, and coherent Debug projection for the existing 51 tables without schema or index changes.

#### Scenario: Final-cluster transaction encounters a fault
- **WHEN** an expected-basis transaction loses its CAS or any row write fails
- **THEN** all affected tables remain at the prior committed state
- **AND** application diff, bundle, retry, conflict, and maintenance policy is not evaluated inside the repository

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

### Requirement: Repository operation access SHALL be bounded and policy-free

Opening the Rust repository SHALL verify and initialize durable storage without classifying operation lifecycle state. The repository SHALL expose bounded operation reads that can filter lifecycle and basis kind and continue from a stable operation identity so the explicit runtime startup reconciler owns all restart policy.

#### Scenario: Repository reopens with non-terminal operations

- **WHEN** the repository opens with pending or running operation rows
- **THEN** it SHALL preserve those rows unchanged for explicit startup reconciliation

#### Scenario: Runtime requests the next operation page

- **WHEN** a caller supplies lifecycle filters, optional basis-kind filters, and the previous operation ID
- **THEN** the repository SHALL return the next bounded page in stable operation-ID order
- **AND** updates to timestamps or lifecycle fields SHALL NOT skip later identities

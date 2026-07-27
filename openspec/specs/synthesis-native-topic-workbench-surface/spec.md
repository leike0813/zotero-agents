# synthesis-native-topic-workbench-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-topic-workbench-surface. Update Purpose after archive.
## Requirements
### Requirement: Topic and Workbench operations SHALL preserve the public contract

The native compatibility boundary SHALL implement exactly the eighteen operations assigned to this change by the R9a operation-ownership matrix. Requests, results, pagination, optional-field behavior, and stable error categories MUST remain compatible with the public `SynthesisClient` contract.

#### Scenario: A Topic or Workbench operation is invoked
- **WHEN** a caller sends a valid owned operation using the versioned args envelope
- **THEN** Rust returns the legacy-compatible typed result through the native client
- **AND** no legacy service or composition is invoked

#### Scenario: Internal and public request shapes differ
- **WHEN** the public method omits basis hashes or worker payload details owned by the runtime
- **THEN** the compatibility boundary derives them from a coherent native snapshot
- **AND** it does not require the caller to supply internal application fields

### Requirement: Topic mutations and background work SHALL be durable and bounded

Topic synthesis, digest, discovery, deletion, purge, related-item echo, resolver, and background-job behavior SHALL use typed Rust owners and declared reverse-Host effects. Accepted work MUST have durable identity and MUST honor request bounds, deadlines, basis checks, and idempotency.

#### Scenario: A Topic mutation is admitted
- **WHEN** mutation admission is enabled and all preconditions match
- **THEN** the mutation records its durable result and any Host-effect receipt exactly once

#### Scenario: A request expires before an effect
- **WHEN** its deadline is exceeded before a repository, canonical, worker, or Host mutation
- **THEN** the operation fails with the stable timeout category
- **AND** no later side effect is applied

### Requirement: Ready-roster admission SHALL require operation-level parity

Every owned operation SHALL have language-neutral differential evidence for its observable result and failure behavior before it is added to the ready roster.

#### Scenario: A registered handler lacks parity evidence
- **WHEN** the handler exists but any required differential, restart, bounds, or mutation case is missing or failing
- **THEN** that operation remains absent from the ready roster
- **AND** production activation remains closed


# synthesis-native-reference-canonical-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-reference-canonical-surface. Update Purpose after archive.
## Requirements
### Requirement: Reference and canonical operations SHALL preserve public semantics

The native surface SHALL implement exactly the sixteen Reference and Canonical operations assigned by the R9a operation-ownership matrix. Public ranking, attention, index, review, proposal, batch, merge, metadata, archive, refresh, retry, and advanced-matching DTOs MUST remain compatible.

#### Scenario: A reference read or review is requested
- **WHEN** the request is valid for the current repository and canonical basis
- **THEN** Rust returns or applies the compatible typed result
- **AND** no unrelated review action is used as a substitute

### Requirement: Canonical mutations SHALL be coherent and durable

Canonical merge, metadata, archive, revision review, and merge-request operations SHALL use dedicated canonical ports under the sole Rust owner. Multi-operation requests MUST honor their public validation and atomicity contract.

#### Scenario: A canonical batch is valid
- **WHEN** every command matches the captured basis and passes validation
- **THEN** the runtime commits the batch and durable receipt consistently across repository and canonical state

#### Scenario: A command is stale or invalid
- **WHEN** any required precondition fails
- **THEN** the runtime returns the stable conflict or validation result
- **AND** it does not apply an unauthorized partial canonical mutation

### Requirement: Matching jobs and readiness SHALL be evidence-backed

Reference refresh and advanced matching SHALL consume bounded reverse-Host pages, execute native worker compute, and persist job/proposal state. Every owned operation SHALL pass differential, restart, conflict, batch, bounds, and deadline evidence before ready-roster admission.

#### Scenario: A matching handler lacks full evidence
- **WHEN** registration succeeds but Host-fed job, durable proposal, or public DTO parity is incomplete
- **THEN** the operation remains not ready


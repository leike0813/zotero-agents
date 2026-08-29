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

Canonical merge, metadata, archive, revision review, and merge-request operations SHALL be planned and projected by the Reference application owner and committed through a dedicated high-level canonical persistence interface. Every durable write MUST receive a caller-supplied promotion checkpoint. Multi-operation requests MUST honor their public validation and atomicity contract without exposing repository owners, locks, transaction closures, table records, or maintenance lifecycle records across the application seam.

#### Scenario: A canonical batch is valid
- **WHEN** every command matches the captured basis, passes validation, and passes its promotion checkpoint
- **THEN** the canonical persistence adapter commits the batch, dependent cache-stale facts, and durable receipt in one atomic operation
- **AND** the application returns a compatible typed result.

#### Scenario: A command is stale or invalid
- **WHEN** any required precondition fails
- **THEN** the application returns the stable conflict or validation result
- **AND** it does not apply an unauthorized partial canonical mutation.

#### Scenario: Promotion is no longer permitted
- **WHEN** the caller-supplied checkpoint rejects a durable Canonical Reference write
- **THEN** the application returns the stable stopping or cancellation outcome
- **AND** it performs no durable mutation or terminal maintenance transition.

### Requirement: Matching jobs and readiness SHALL be evidence-backed

Reference refresh and advanced matching SHALL consume bounded reverse-Host pages, execute native worker compute, and persist job/proposal state. Every owned operation SHALL pass differential, restart, conflict, batch, bounds, and deadline evidence before ready-roster admission.

#### Scenario: A matching handler lacks full evidence
- **WHEN** registration succeeds but Host-fed job, durable proposal, or public DTO parity is incomplete
- **THEN** the operation remains not ready

### Requirement: Reference operations SHALL use generic spans and facts

Reference refresh and Advanced Matching SHALL use the common boundary model.
Matching facts are limited to matching hash and proposal, fact, and warning
counts; warning text and library identifiers SHALL be absent.

#### Scenario: Advanced Matching completes
- **WHEN** binding, dedupe, and durable promotion reach a terminal state
- **THEN** one causal trace contains both worker attempts and allowlisted counts

### Requirement: Reference semantic projections SHALL have one application owner

Reference index, ranking, attention, review, and workbench projections SHALL be selected, ordered, paginated, and interpreted by the grouped Reference application owner. Runtime adapters SHALL only decode requests and encode the compatible public representation.

#### Scenario: A Reference projection is requested
- **WHEN** a runtime route supplies a valid typed projection query
- **THEN** the application returns a typed semantic projection from one coherent durable basis
- **AND** no projection selection, ranking, or effective-identity rule is reimplemented in the runtime adapter.


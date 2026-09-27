# synthesis-native-concept-topic-graph-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-concept-topic-graph-surface. Update Purpose after archive.
## Requirements
### Requirement: Concept and Topic Graph operations SHALL preserve public DTOs

The native surface SHALL implement exactly the nine Concept KB and Topic Graph operations assigned by the R9a operation-ownership matrix. Public query, patch, delete, review, relation, and rebuild methods MUST NOT require internal basis hashes or full aggregate payloads.

#### Scenario: A public patch omits unchanged fields
- **WHEN** the caller submits a valid public Concept or Topic Graph action
- **THEN** the compatibility boundary derives a coherent typed CAS command
- **AND** returns the compatible public result

### Requirement: Review and index state SHALL be domain-specific and durable

Concept reviews and Topic Graph relation reviews SHALL use their dedicated typed applications. Accepted or rejected state and rebuilt indexes MUST survive reopen with deterministic observable ordering.

#### Scenario: Concurrent state changes during adaptation
- **WHEN** the captured basis no longer matches at commit
- **THEN** the operation fails with the stable conflict result
- **AND** no partial review or index mutation is applied

### Requirement: Readiness SHALL require public and durable parity

Every owned operation SHALL pass differential DTO, stale-basis, deterministic-index, restart, bounds, and deadline fixtures before ready-roster admission.

#### Scenario: Internal application tests pass without public fixtures
- **WHEN** typed application parity exists but the public adapter has not passed its fixtures
- **THEN** the operation remains not ready

### Requirement: Historical Concept review proposals SHALL be canonically decoded

The native Concept and Topic Graph surface SHALL accept the known historical proposal spellings used by persisted review rows, including `local_id`, while preserving the closed public review DTO. Unknown fields outside the approved historical compatibility set SHALL still fail closed.

#### Scenario: A persisted review contains local_id

- **WHEN** the Concept surface reads a review proposal containing `local_id` and otherwise valid proposal fields
- **THEN** the proposal is decoded into the canonical internal representation
- **AND** the complete Workbench surface passes the existing strict capability validator
- **AND** the public review item contains no storage-only proposal field.

#### Scenario: A persisted review contains an unsupported field

- **WHEN** the Concept surface reads a proposal with a field outside the approved compatibility set
- **THEN** the proposal is rejected with the existing projection-invalid behavior
- **AND** no partially projected Concept surface is returned.

### Requirement: Historical Topic artifact data SHALL be projected into the public Topic DTO

Topic detail reads SHALL project stored artifact sections, source papers, manifests, metadata, and nested objects into the current public Topic contract. Historical storage fields SHALL remain private and SHALL NOT be forwarded as raw public result objects.

#### Scenario: A historical artifact contains extension fields

- **WHEN** a ready Topic detail is read from an artifact containing fields not present in the current public contract
- **THEN** the response contains the canonical public fields and defaults required by the contract
- **AND** the response passes recursive capability validation.

#### Scenario: A required Topic field cannot be projected

- **WHEN** a historical artifact lacks a required value and no canonical default exists
- **THEN** the operation returns the existing unavailable/diagnostic result
- **AND** it does not emit an invalid ready result.


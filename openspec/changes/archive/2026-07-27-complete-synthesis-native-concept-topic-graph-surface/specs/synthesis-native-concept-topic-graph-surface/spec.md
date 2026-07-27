## ADDED Requirements

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

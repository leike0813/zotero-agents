# synthesis-native-artifact-library-debug-surface Specification

## Purpose
TBD - created by archiving change complete-synthesis-native-artifact-library-debug-surface. Update Purpose after archive.
## Requirements
### Requirement: Artifact, Library, schema, and Debug reads SHALL be compatible

The native surface SHALL implement exactly the twelve operations assigned to this change by the R9a operation-ownership matrix. Public DTOs, pagination, ordering, optional fields, redaction, and stable errors MUST remain compatible.

#### Scenario: A projection is requested
- **WHEN** the repository, canonical, and artifact bases are coherent
- **THEN** Rust returns the compatible bounded projection
- **AND** no production root path, credential, Host object, or arbitrary internal struct is disclosed

### Requirement: Filtered artifact export SHALL use the declared Host delivery port

Rust SHALL select and describe exported artifacts, while Host delivery SHALL occur only through the authenticated, bounded reverse-Host port with a typed receipt.

#### Scenario: Export delivery fails or expires
- **WHEN** the Host disconnects, rejects delivery, exceeds a bound, or the deadline expires before delivery
- **THEN** the operation returns the stable failure
- **AND** does not report a successful export receipt

### Requirement: Readiness SHALL include projection and redaction evidence

Every owned operation SHALL pass differential, pagination, reopen, redaction, export-failure, bounds, and deadline fixtures before ready-roster admission.

#### Scenario: A placeholder projection is registered
- **WHEN** a handler returns only a maintenance subset or another non-equivalent DTO
- **THEN** parity fails and the operation remains not ready

### Requirement: Complete multi-paper exports SHALL be behaviorally verified

Native artifact evidence SHALL exercise nonempty multi-paper data, complete manifest/content correspondence, filtered kinds, pagination, delayed Host reads, local and remote delivery, and typed failures through real production participants. Declared case labels, empty results, or schema agreement alone SHALL NOT establish export readiness.

#### Scenario: A 24-paper Planned Topic prepares
- **WHEN** the resolver selects 24 papers with all four artifact kinds
- **THEN** the production export produces a complete consumable manifest and contents
- **AND** the preparation runtime produces its handoff with every selected paper accounted for

#### Scenario: Delivery fails before completion
- **WHEN** content retrieval or delivery fails, times out, or shuts down before successful completion
- **THEN** no successful manifest receipt or prepare handoff is produced
- **AND** owned transfer resources are released through the bounded lifecycle


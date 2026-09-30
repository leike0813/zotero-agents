## ADDED Requirements

### Requirement: Stored attachment staging is owner-scoped and immutable

The native owner SHALL provide trusted stored-attachment preparation for regular Workspace paths only, using the existing lexical/resolved containment verifier and private staging owner. It SHALL reject source handles, external paths, managed snapshot aliases, unsafe links, URLs and base64. Copy, quota, size and digest verification SHALL produce an immutable opaque prepared file accepted by the canonical Broker. Import SHALL create managed storage and replacement SHALL require a stored attachment. Every exit path SHALL clean private staging or report cleanup pending; source and stage paths SHALL remain absent from model and durable evidence.

#### Scenario: Source changes after preflight
- **WHEN** the Workspace source changes after a verified snapshot is prepared
- **THEN** the Broker reads the snapshot bound to the approved plan, and renewed preparation changes the plan digest

#### Scenario: Stage cleanup fails
- **WHEN** private cleanup cannot complete
- **THEN** the owner reports cleanup pending rather than claiming rollback complete

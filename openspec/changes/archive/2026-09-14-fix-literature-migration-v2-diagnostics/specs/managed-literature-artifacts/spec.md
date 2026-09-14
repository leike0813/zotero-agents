## ADDED Requirements

### Requirement: Stored Literature Score compatibility SHALL remain internal

Stored Literature Score reads SHALL accept the bare canonical artifact and the exact historical four-field storage envelope emitted by the former workflow, normalize both to the same canonical payload, and SHALL NOT widen the external producer or import contract.

#### Scenario: A historical Literature Score is read
- **WHEN** a managed Score note contains `{ version: 1, entry: <non-empty>, format: "json", literature_score: <valid literature_score.v1> }`
- **THEN** managed detail and derived readiness SHALL return the canonical inner Score artifact
- **AND** the read SHALL NOT rewrite the note or its attachment.

#### Scenario: A generic Score wrapper is submitted
- **WHEN** an external producer or importer submits `{ literature_score: <artifact> }` without the exact historical storage metadata
- **THEN** strict canonical validation SHALL reject it
- **AND** stored-read compatibility SHALL NOT become an alternate public score schema.

### Requirement: Managed singleton discovery SHALL be kind-scoped

Managed singleton discovery SHALL be scoped to the requested managed kind. A different known managed kind SHALL not be parsed as a dependency, while unknown, conflicting, or same-kind content SHALL continue to fail closed.

#### Scenario: An unrelated managed sibling is damaged
- **WHEN** a caller discovers References or Citation and another child note is explicitly marked as a different managed kind but has an invalid or unreadable payload
- **THEN** discovery SHALL ignore that sibling for the requested kind
- **AND** direct discovery or reading of the damaged sibling SHALL still return its own typed diagnostic.

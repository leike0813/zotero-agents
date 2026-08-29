## ADDED Requirements

### Requirement: Production client request admission SHALL use the operation budget

Production `client.*` requests SHALL allow one string member to consume up to the operation's aggregate 1 MiB request budget. JSON depth and node limits SHALL remain enforced, and non-production sidecar capabilities SHALL retain the general 64 KiB string-member bound.

#### Scenario: Digest request contains one large valid string
- **WHEN** a production literature-digest apply request contains a string larger than 64 KiB while the complete request remains within 1 MiB
- **THEN** request admission accepts it for typed operation validation

#### Scenario: Production request exceeds its aggregate budget
- **WHEN** the serialized production request exceeds 1 MiB
- **THEN** request admission rejects it before application dispatch

#### Scenario: General capability contains an oversized string
- **WHEN** a non-production capability contains a string larger than 64 KiB
- **THEN** request admission rejects it under the general member bound

### Requirement: Native literature apply SHALL commit complete scoped state atomically

`client.applyLiteratureDigestSidecar` SHALL validate the public workflow DTO and apply artifact descriptors, changed reference and citation-analysis projections, safe canonical bindings, citation roles, bounded literature matching metadata, cache staleness, and the success receipt in one SQLite transaction through the reference-refresh application. Digest-only changes SHALL NOT rebuild unchanged raw references. No Node fallback or second public interface SHALL participate.

#### Scenario: Complete literature apply succeeds
- **WHEN** a valid request carries digest, references, citation-analysis, matching metadata, and matched-reference evidence for one source
- **THEN** the native repository persists the corresponding artifact, reference, role, unambiguous binding, metadata, cache, and receipt state
- **AND** the public result remains compatible and reports `sidecar_applied`

#### Scenario: Identical literature apply repeats
- **WHEN** a request has the same canonical inputs as an already successful apply
- **THEN** the native operation returns an unchanged idempotent `sidecar_applied` result
- **AND** it does not duplicate references, bindings, metadata, or receipts

#### Scenario: Literature apply fails before commit
- **WHEN** validation, artifact preparation, reference projection, or transaction commit fails
- **THEN** no partial artifact, reference, role, binding, matching metadata, cache mutation, or success receipt remains

#### Scenario: Matching evidence is ambiguous
- **WHEN** no citekey match exists and title plus year identifies more than one candidate
- **THEN** the apply leaves that reference unbound

#### Scenario: Only digest content changes
- **WHEN** digest descriptor or hash changes while reference and citation-analysis facts remain identical
- **THEN** artifact state and matching metadata may update
- **AND** raw references are not rebuilt and graph-related caches are not marked stale without fact changes

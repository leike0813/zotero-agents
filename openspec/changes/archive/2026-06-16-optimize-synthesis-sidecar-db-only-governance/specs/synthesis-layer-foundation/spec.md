## MODIFIED Requirements

### Requirement: Knowledge Graph canonical store layout is initialized
Synthesis Layer foundation SHALL initialize only the minimal Synthesis root for
generic store access. Domain directories SHALL be created by the operation that
actually writes files in that domain.

#### Scenario: Empty store is initialized
- **WHEN** the foundation initializer runs against an empty runtime root
- **THEN** it SHALL create the `synthesis` root
- **AND** it SHALL return the known directory paths
- **AND** it SHALL NOT create empty `concepts`, `topic-graph`,
  `citation-graph`, `tags`, `sync`, or `sidecar/transactions` directories.

### Requirement: Canonical transactions emit a single store change event
Synthesis Layer foundation SHALL group canonical writes in an internal
transaction that records receipts and emits one `canonical-store-changed` event
after a successful commit.

#### Scenario: Transaction commits multiple assets
- **WHEN** one transaction writes multiple canonical assets in the same scope
- **THEN** the foundation SHALL persist the assets
- **AND** it SHALL record one receipt in DB-backed canonical-store records
- **AND** it SHALL emit exactly one DB-backed `canonical-store-changed` event
  containing the scope, changed assets, transaction id, and timestamp
- **AND** it SHALL NOT append normal runtime records to
  `sidecar/canonical-store-receipts.jsonl` or
  `sidecar/canonical-store-events.jsonl`.

### Requirement: Projection registry tracks stale and rebuild state
Synthesis Layer foundation SHALL maintain lightweight projection state in the
Synthesis repository DB without treating JSON or SQLite projection files as
canonical sync assets.

#### Scenario: Canonical transaction marks projections stale
- **WHEN** a canonical transaction commits for a domain scope
- **THEN** the matching projection state SHALL be marked stale in repository DB
- **AND** it SHALL record the transaction id, source manifest hash when
  available, and update timestamp.

#### Scenario: Projection rebuild is recorded
- **WHEN** a projection rebuild completes for a target
- **THEN** the projection registry SHALL record schema version, source manifest
  hash, stale flag, last rebuild time, and diagnostics in repository DB
- **AND** deleting `data/synthesis/sidecar/projection-registry.json` SHALL NOT
  remove the registry state needed to know that the projection is rebuildable.

### Requirement: Foundation diagnostics are sanitized
Synthesis Layer foundation SHALL sanitize diagnostics emitted by canonical store
helpers and persist them as DB-backed canonical-store records.

#### Scenario: Sensitive diagnostic input is recorded
- **WHEN** diagnostics include tokens, secrets, or absolute runtime paths
- **THEN** persisted diagnostics SHALL omit token and secret values
- **AND** persisted diagnostics SHALL not contain the raw absolute path
- **AND** normal runtime SHALL NOT append the diagnostic to
  `sidecar/canonical-store-diagnostics.jsonl`.

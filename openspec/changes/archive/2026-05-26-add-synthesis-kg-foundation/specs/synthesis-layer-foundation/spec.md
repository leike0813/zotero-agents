# synthesis-layer-foundation Delta

## ADDED Requirements

### Requirement: Knowledge Graph canonical store layout is initialized

Synthesis Layer foundation SHALL initialize a minimal Knowledge Graph canonical
store under `synthesis/` with domain directories for topics, concepts,
topic-graph, citation-graph, tags, sync, and local state.

#### Scenario: Empty store is initialized

- **WHEN** the foundation initializer runs against an empty runtime root
- **THEN** it SHALL create `synthesis/topics`, `synthesis/concepts`,
  `synthesis/topic-graph`, `synthesis/citation-graph`, `synthesis/tags`,
  `synthesis/sync`, and `synthesis/state`
- **AND** it SHALL return the initialized directory paths.

### Requirement: Canonical asset service validates and persists assets

Synthesis Layer foundation SHALL provide internal helpers that read, validate,
and write canonical JSON assets through registered schemas and plugin-safe
runtime persistence APIs.

#### Scenario: Valid asset is written and read

- **WHEN** a canonical JSON asset matches its registered schema
- **THEN** the asset service SHALL persist it as a versioned canonical envelope
- **AND** a later read SHALL return the validated envelope data.

#### Scenario: Invalid asset is rejected

- **WHEN** a canonical JSON asset fails registered schema validation
- **THEN** the asset service SHALL reject the write
- **AND** it SHALL NOT replace the target asset.

### Requirement: Canonical transactions emit a single store change event

Synthesis Layer foundation SHALL group canonical writes in an internal
transaction that writes receipts and emits one `canonical-store-changed` event
after a successful commit.

#### Scenario: Transaction commits multiple assets

- **WHEN** one transaction writes multiple canonical assets in the same scope
- **THEN** the foundation SHALL persist the assets
- **AND** it SHALL record one receipt for the transaction
- **AND** it SHALL emit exactly one `canonical-store-changed` event containing
  the scope, changed assets, transaction id, and timestamp.

#### Scenario: Transaction fails validation

- **WHEN** any transaction asset fails validation before commit
- **THEN** the foundation SHALL leave existing target assets unchanged
- **AND** it SHALL write sanitized diagnostics for the failed transaction.

### Requirement: Projection registry tracks stale and rebuild state

Synthesis Layer foundation SHALL maintain lightweight projection state for
Knowledge Graph domains without treating SQLite files as canonical sync assets.

#### Scenario: Canonical transaction marks projections stale

- **WHEN** a canonical transaction commits for a domain scope
- **THEN** the matching projection state SHALL be marked stale
- **AND** it SHALL record the transaction id, source manifest hash when
  available, and update timestamp.

#### Scenario: Projection rebuild is recorded

- **WHEN** a projection rebuild completes for a target
- **THEN** the projection registry SHALL record schema version, source manifest
  hash, stale flag, last rebuild time, and diagnostics
- **AND** deleting `state/*.sqlite` SHALL NOT remove the registry state needed to
  know that the projection is rebuildable.

### Requirement: Foundation diagnostics are sanitized

Synthesis Layer foundation SHALL sanitize diagnostics emitted by canonical store
helpers.

#### Scenario: Sensitive diagnostic input is recorded

- **WHEN** diagnostics include tokens, secrets, or absolute runtime paths
- **THEN** persisted diagnostics SHALL omit token and secret values
- **AND** persisted diagnostics SHALL not contain the raw absolute path.

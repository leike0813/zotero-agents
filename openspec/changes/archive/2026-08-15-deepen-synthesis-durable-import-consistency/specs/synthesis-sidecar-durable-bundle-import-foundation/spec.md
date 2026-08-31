## MODIFIED Requirements

### Requirement: Durable import SHALL expose typed Rust parity

The Rust application SHALL verify and classify a pinned bundle, reject tombstones and unacknowledged unbased updates, consume one receipt once, and coordinate one expected-basis SQLite transaction with recoverable canonical staging. Production acquisition SHALL reconcile repository and canonical import evidence before the runtime can publish ready discovery or serve reads and mutations.

#### Scenario: Import fails before canonical promotion

- **WHEN** canonical staging succeeds but repository CAS loses its basis, the repository transaction faults, or immediate staged-batch discard fails
- **THEN** SQLite and canonical current SHALL remain at their prior committed state
- **AND** the original repository failure SHALL remain primary
- **AND** a later production acquisition SHALL discard the staged batch because no repository commit receipt exists.

#### Scenario: Import restarts after repository commit

- **WHEN** SQLite contains the matching durable import receipt and canonical staging survives a restart
- **THEN** production acquisition SHALL roll forward canonical promotion before publishing ready discovery
- **AND** it SHALL verify every promoted canonical target
- **AND** it SHALL clear the repository receipt only after verification succeeds.

#### Scenario: Import restarts after canonical promotion

- **WHEN** SQLite contains the durable import receipt and canonical targets are already promoted
- **THEN** production acquisition SHALL verify the targets and clear the receipt before publishing ready discovery
- **AND** it SHALL NOT repeat repository effects.

#### Scenario: Durable import evidence is inconsistent

- **WHEN** the repository receipt, canonical batch, or promoted targets cannot prove one consistent committed import
- **THEN** production acquisition SHALL fail with a reason-level startup code
- **AND** the runtime SHALL preserve the evidence and publish no ready discovery
- **AND** it SHALL NOT choose a repair or compensation policy automatically.

#### Scenario: Durable formats survive the ownership change

- **WHEN** an existing repository receipt, canonical batch, bundle manifest, or WebDAV request is consumed after the change
- **THEN** its persisted or wire format SHALL remain unchanged.

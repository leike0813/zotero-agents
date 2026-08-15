# synthesis-sidecar-durable-bundle-import-foundation Specification

## Purpose

Define typed Rust parity, rollback, and restart recovery for durable bundle import.

## Requirements

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

### Requirement: Durable import SHALL commit only a normalized redirect graph

Durable import SHALL evaluate the complete prospective canonical redirect graph after applying imported entities and before committing the repository transaction. Cycles SHALL be repaired using the same deterministic precedence and proposal supersession semantics as startup recovery, and the local repaired state SHALL remain eligible for later export.

#### Scenario: Imported redirect entries form a cycle
- **WHEN** a valid durable bundle would leave canonical redirects cyclic
- **THEN** import SHALL repair the prospective graph before commit
- **AND** record the displaced edge and proposal state in the import transaction
- **AND** later capture SHALL expose the repaired local facts.

#### Scenario: Imported redirect graph is already valid
- **WHEN** imported redirects already form an acyclic rooted forest
- **THEN** normalization SHALL leave their topology and proposal states unchanged.

### Requirement: Durable import SHALL decode canonical assets before staging

Durable import SHALL translate verified bundle envelopes into transport-neutral canonical Topic assets and SHALL use the canonical representation interface to decode them into opaque prepared writes before canonical batch staging. The durable application SHALL continue to own conflict policy, SQLite commit receipt, staging coordination, target verification, and restart reconciliation.

#### Scenario: Valid canonical assets are imported
- **WHEN** a verified bundle contains a complete valid canonical Topic asset set
- **THEN** canonical decoding produces a prepared write whose path, hashes, bytes, and promotion target preserve the existing format
- **AND** the existing receipt-first staging and recovery protocol consumes that prepared write without a wire or persisted-format change

#### Scenario: Canonical assets disagree
- **WHEN** canonical Topic asset paths, declared hashes, contents, or identity are inconsistent
- **THEN** import fails before canonical staging or the SQLite import transaction
- **AND** no current Topic or durable repository fact changes

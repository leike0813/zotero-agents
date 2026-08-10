# synthesis-sidecar-durable-bundle-import-foundation Specification

## Purpose

Define typed Rust parity, rollback, and restart recovery for durable bundle import.

## Requirements

### Requirement: Durable import SHALL expose typed Rust parity
The Rust application SHALL verify and classify a pinned bundle, reject tombstones and unacknowledged unbased updates, consume one receipt once, and coordinate one expected-basis SQLite transaction with recoverable canonical staging.

#### Scenario: Import fails before canonical promotion
- **WHEN** canonical staging fails, repository CAS loses its basis, or the repository transaction faults
- **THEN** staged canonical state is discarded
- **AND** SQLite and canonical current remain at their prior committed state

#### Scenario: Import restarts after repository commit
- **WHEN** SQLite contains the matching durable import receipt and canonical staging survives a restart
- **THEN** recovery completes or safely discards the batch according to the existing receipt contract
- **AND** the repository receipt is cleared only after successful canonical completion

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

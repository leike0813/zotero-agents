## ADDED Requirements

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

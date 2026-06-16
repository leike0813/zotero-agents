## ADDED Requirements

### Requirement: Synthesis docs define Git Sync durable-state exchange

Active Synthesis layer documentation SHALL describe Git Sync as the first-class cross-device durable-state exchange mechanism.

#### Scenario: Developer reads Synthesis layer docs

- **WHEN** active docs describe persistence, import/export, recovery, or sync
- **THEN** they SHALL distinguish SQLite as a local materialized store from Git as the durable exchange store
- **AND** they SHALL link to the Git Sync durable-state contract.

#### Scenario: Developer reads migration guidance

- **WHEN** active docs describe durable sync compatibility
- **THEN** they SHALL state that Git asset schema migration is separate from SQLite schema migration
- **AND** unknown future asset schemas require a plugin upgrade before import.

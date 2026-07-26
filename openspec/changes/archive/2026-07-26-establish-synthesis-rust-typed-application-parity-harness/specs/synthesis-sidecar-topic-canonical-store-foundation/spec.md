## ADDED Requirements

### Requirement: Rust canonical store SHALL expose a typed Topic adapter

The Rust canonical owner SHALL expose typed `read_current`, `promote`, and `receipt` operations that strictly rebuild existing Topic snapshots and delegate bytes, hashes, CAS, writer admission, journal, fsync, recovery, and repair behavior to the current durable implementation.

#### Scenario: Typed application promotes a snapshot
- **WHEN** Topic supplies a complete typed snapshot and expected create or update basis
- **THEN** the adapter returns the existing typed receipt and current state
- **AND** it introduces no second journal, alternate commit path, schema, or canonical serializer

#### Scenario: Store is busy or repair-required
- **WHEN** typed Topic promotion encounters active writer admission or a failed-closed owner
- **THEN** it returns `canonical_store_busy` or `repair_required`
- **AND** the application performs no domain projection write

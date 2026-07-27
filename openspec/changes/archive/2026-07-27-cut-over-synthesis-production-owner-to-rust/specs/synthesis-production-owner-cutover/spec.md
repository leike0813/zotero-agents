## ADDED Requirements

### Requirement: Compatible upgrade SHALL trigger one bounded cutover

When a compatible manifest-v2 Rust runtime is installed and no completed production-owner receipt exists, the plugin SHALL start a generation-scoped background cutover coordinator. Zotero window startup MUST remain non-blocking while Synthesis reports starting, maintenance, unavailable, or repair-required.

#### Scenario: First compatible upgrade starts
- **WHEN** the plugin detects legacy production ownership and a compatible native bundle
- **THEN** it rejects new Synthesis mutations and starts exactly one cutover attempt for that profile generation

#### Scenario: Completed receipt already exists
- **WHEN** the current production roots and native identity match a completed cutover receipt
- **THEN** the coordinator starts the native owner without repeating backup or migration

### Requirement: Cutover SHALL verify a consistent recoverable backup

Before the native service can open production roots, the coordinator SHALL drain or cancel active operations, close the legacy writer, verify lock release, and create a consistent backup of the database, WAL/SHM state, canonical root, schema identity, manifest hashes, durable decisions, runtime fingerprint, and legacy owner marker.

#### Scenario: Backup verification fails
- **WHEN** any required source, hash, durable summary, or restore probe is incomplete
- **THEN** cutover stops before native ownership
- **AND** the legacy owner remains authoritative

### Requirement: Native preflight SHALL precede owner transfer

The Rust service SHALL dry-run schema and canonical recovery, capability completeness, reverse-Host connectivity, profile/runtime identity, and production-copy reads before acquiring the production owner lock.

#### Scenario: Preflight detects drift
- **WHEN** schema, canonical bytes, durable state, capabilities, or identity are incompatible
- **THEN** the candidate fails closed without changing production owner or mutation state

### Requirement: Owner transfer SHALL be atomic and receipted

The Rust service SHALL acquire the only production owner lock, perform approved forward migrations, open the production repository and canonical root, and atomically record an owner marker and cutover receipt before the plugin publishes a native client. The receipt SHALL bind source backup, source and target schema, canonical manifest, durable summary, bundle fingerprint, worker identity, profile, and service instance.

#### Scenario: Owner lock is contested
- **WHEN** another process or legacy writer still owns the production scope
- **THEN** the Rust service refuses production startup and performs no migration

#### Scenario: Transfer completes
- **WHEN** migration, open, owner marker, and receipt persistence all succeed
- **THEN** the plugin publishes the native client with mutation disabled
- **AND** the plugin can no longer open the production database or canonical root

### Requirement: Mutation admission SHALL follow critical smoke

The coordinator SHALL validate health, handshake, storage, Workbench chrome, Topic list/detail and canonical manifest, reference/cache status, graph reads, and one non-destructive worker operation before enabling native mutations.

#### Scenario: Critical smoke succeeds
- **WHEN** every critical read and worker responsiveness check succeeds for the receipted owner
- **THEN** the service enables mutation admission and completes the receipt

#### Scenario: Critical smoke fails
- **WHEN** any critical check fails before mutation admission
- **THEN** the coordinator stops the native owner and enters pre-mutation recovery

### Requirement: Recovery SHALL depend on mutation admission

Failure before native migration SHALL leave the legacy owner usable. Failure after migration but before mutation admission SHALL stop the service and either perform a verified compatible reversal or restore the verified backup. Failure after mutation admission MUST NOT automatically return ownership or route requests to legacy/Node.

#### Scenario: Failure occurs before mutation admission
- **WHEN** native production state was written but mutations were never enabled
- **THEN** recovery requires owner-lock release and a verified reversal or backup restore before any writer resumes

#### Scenario: Failure occurs after mutation admission
- **WHEN** the active native owner crashes or becomes unavailable
- **THEN** the plugin remains fail closed and uses compatible Rust repair, restart, forward recovery, or explicit restore
- **AND** no legacy fallback is attempted


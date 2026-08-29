## ADDED Requirements

### Requirement: Runtime admission SHALL be generation scoped

The plugin SHALL persist current native runtime admission independently from
the immutable first cutover receipt. Current admission SHALL bind one
monotonic generation to profile, runtime target, protocol, data schema, bundle,
build fingerprint, capability fingerprint, service identity, and durable
activation evidence.

#### Scenario: Existing admitted profile starts after the feature is installed
- **WHEN** the first cutover receipt, installed runtime, and production identity agree and no runtime-admission state exists
- **THEN** the plugin creates generation 1 admission without changing the first cutover receipt or production data

#### Scenario: Matching admitted generation restarts
- **WHEN** installed and current admission identities match
- **THEN** the plugin starts that generation without another upgrade backup or preflight

### Requirement: Automatic upgrade SHALL require exact compatibility

The plugin SHALL start an automatic Rust-to-Rust upgrade only when profile,
runtime target, protocol version, production data schema, and capability
fingerprint equal current admission and only the verified build fingerprint
changes.

#### Scenario: Compatible build is installed
- **WHEN** the new verified bundle differs only by bundle/build identity
- **THEN** the plugin creates one pending next generation and begins bounded native upgrade

#### Scenario: Contract identity changes
- **WHEN** protocol, schema, target, profile, or capability fingerprint differs
- **THEN** startup fails closed before writing pending state or production data

#### Scenario: Previous admitted bundle is unavailable
- **WHEN** the current build fingerprint cannot be resolved and verified
- **THEN** startup fails closed before stopping the current owner or writing upgrade state

### Requirement: Upgrade SHALL verify backup and candidate before activation

The coordinator SHALL stop the old Rust owner, verify owner-lock release,
create a content-addressed backup of the database family and canonical tree,
run target preflight on the backup copy, and run generation-bound critical
smoke against the mutation-disabled candidate before requesting activation.

#### Scenario: Candidate reaches activation
- **WHEN** backup, preflight, launch, identity checks, and every critical-smoke entry succeed for the pending generation
- **THEN** Rust may durably activate that generation
- **AND** the plugin may atomically promote it to current

#### Scenario: Candidate identity is stale
- **WHEN** discovery, health, handshake, smoke, or activation evidence reports another generation
- **THEN** the candidate cannot activate or promote

### Requirement: Recovery SHALL use durable activation as its boundary

Before target activation is durable, failure SHALL stop the target, restore
and verify the backup, clear pending state, and restart the verified previous
Rust generation. After target activation is durable, automatic rollback MUST
be prohibited; matching Rust activation evidence SHALL permit idempotent
promotion and all other states SHALL require Rust-only repair.

#### Scenario: Backup, preflight, launch, or smoke fails
- **WHEN** no matching target activation evidence is durable
- **THEN** the coordinator restores the original data and previous Rust generation
- **AND** it does not invoke plugin/Node ownership or clean reset

#### Scenario: Promotion is interrupted
- **WHEN** Rust contains matching durable activation evidence for the pending generation but current admission was not replaced
- **THEN** restart completes promotion without restoring the backup or starting the previous generation

#### Scenario: Failure follows promotion
- **WHEN** startup reconcile or readiness publication fails after current admission advances
- **THEN** the profile remains on the new generation in Rust-only repair
- **AND** old data and the previous generation are not restored

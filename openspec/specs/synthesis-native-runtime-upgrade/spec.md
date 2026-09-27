# synthesis-native-runtime-upgrade Specification

## Purpose

Defines how an XPI update replaces its bundled sidecar and how repository
schema changes are migrated.

## Requirements

### Requirement: Sidecar replacement SHALL follow XPI replacement

The sidecar SHALL have no independent online update, generation promotion,
runtime rollback, or mutable version selection. Installing a new XPI changes
the packaged runtime; the next startup verifies and replaces the single current
runtime.

#### Scenario: A new XPI contains another sidecar build
- **WHEN** the plugin next starts
- **THEN** installation replaces `current` atomically and launches that runtime

### Requirement: Schema migration SHALL be native-owned and registered

When the current repository schema differs from the runtime schema, Rust SHALL
proceed only when that exact transition has a registered migration. It SHALL
create and verify a migration backup immediately before the migration and
apply the migration transactionally.

#### Scenario: No migration is needed
- **WHEN** production storage already uses the current schema
- **THEN** startup creates no migration backup

#### Scenario: A registered migration is needed
- **WHEN** Rust recognizes the exact source-to-target schema transition
- **THEN** it verifies a backup and applies the migration transactionally

#### Scenario: A transition is not registered
- **WHEN** the production schema is unsupported
- **THEN** startup fails without changing production storage

### Requirement: Failed migration SHALL preserve the original basis

Backup or migration failure SHALL leave the original production basis
recoverable and SHALL prevent service discovery.

#### Scenario: Backup verification fails
- **WHEN** a registered migration cannot obtain a verified backup
- **THEN** migration does not begin

#### Scenario: Transactional migration fails
- **WHEN** migration work returns an error
- **THEN** the original schema and data remain authoritative

### Requirement: Repository readiness SHALL verify additive application tables
Before declaring an existing schema-v1 repository ready, the native repository SHALL idempotently apply the current additive `SCHEMA_SQL` and verify the required application tables and compatible fields. This verification SHALL NOT change the repository schema version or Citation Graph storage format.

#### Scenario: A compatible old schema-v1 database lacks application tables
- **WHEN** the current runtime opens the database
- **THEN** required additive tables are created idempotently before readiness succeeds

#### Scenario: An existing table has an incompatible structure
- **WHEN** additive initialization encounters conflicting fields or constraints
- **THEN** readiness fails closed with `repository_schema_incompatible` and does not report the repository as available

### Requirement: Final acceptance SHALL exercise installation and migration boundaries

The final native-only candidate SHALL be exercised with clean and existing
profiles, offline installation, XPI upgrade, corrupt and wrong-platform
bundles, compatible existing data, registered migration success, backup
failure, migration failure, and unknown schema variants. Every failure case
MUST fail closed without publishing discovery or damaging the prior production
basis.

#### Scenario: Existing profile upgrades successfully
- **WHEN** the candidate opens a supported existing profile requiring a
  registered migration
- **THEN** a verified backup is created, the migration publishes atomically,
  and restart observes the migrated durable facts

#### Scenario: Bundle or migration input is invalid
- **WHEN** installation sees corrupt or wrong-platform bytes, or migration sees
  an unsupported or failing source
- **THEN** startup fails with the stable category before readiness
- **AND** the previous runtime and production basis remain recoverable

### Requirement: Acceptance samples SHALL protect original data

Existing-data and legacy migration rehearsals SHALL use isolated copies and
read-only source snapshots. Receipts SHALL contain only approved identities,
schema facts, counts, statuses, and hashes and MUST NOT expose user content.

#### Scenario: Existing-data rehearsal completes
- **WHEN** migration, restart, ownership, and representative read checks finish
- **THEN** the original sample database and canonical-tree hashes remain
  byte-identical to their pre-test values

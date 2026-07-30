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

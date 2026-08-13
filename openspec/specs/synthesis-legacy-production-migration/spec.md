## Purpose

Defines the one-time, fail-closed adoption of the exact legacy TypeScript Synthesis production stores by the current Rust sidecar without losing durable user facts or treating old cache state as current.

## Requirements

### Requirement: Legacy detection SHALL be exact
The runtime SHALL recognize a legacy source only when its sole legacy schema marker and required table signatures match the supported TypeScript schema. Missing, mixed, unknown, or structurally divergent sources SHALL fail without migration writes.

#### Scenario: Exact supported source
- **WHEN** the production database carries only `schema_version=2026-06-01.sidecar-cache-hard-cut` and the supported table signatures
- **THEN** the runtime accepts it as a registered legacy migration source

#### Scenario: Ambiguous source
- **WHEN** the marker or required schema differs, or a Rust foundation marker is mixed with the legacy marker
- **THEN** startup fails closed and leaves the source database unchanged

### Requirement: Migration SHALL preserve durable facts and invalidate freshness
The migration SHALL preserve user-approved facts, review state, vocabulary and staged data, Topic and Concept facts, terminal operations, external-effect receipts, and last-good projections. Rebuildable cache, index, layout, metrics, and readiness state SHALL be absent or explicitly stale after migration.

#### Scenario: Durable facts migrate
- **WHEN** a supported legacy database is migrated
- **THEN** the migrated database contains the same durable primary-keyed facts under the current schema and does not replay already-applied external effects

#### Scenario: Old cache is present
- **WHEN** legacy cache or readiness rows claim to be ready
- **THEN** the current runtime does not treat those rows as current readiness evidence

### Requirement: Migration publication SHALL be recoverable
The runtime SHALL create and verify one content-addressed legacy backup before publishing a migrated database. A failure before successful validation and publication SHALL leave the legacy database usable and the backup independently readable; repeated current-schema startup SHALL perform no migration write.

#### Scenario: Migration succeeds
- **WHEN** conversion and all integrity, schema, DTO, and fact-count checks pass
- **THEN** the current database is published atomically and the verified legacy backup remains available

#### Scenario: Migration fails
- **WHEN** conversion or validation fails
- **THEN** startup fails without exposing a partially migrated production database

### Requirement: Existing canonical Topics SHALL be adopted without rewriting content
The runtime SHALL validate the legacy Topic definitions, resolvers, paper sets, database rows, and canonical current trees before deriving current Topic application state. Adoption SHALL preserve every pre-existing canonical file byte-for-byte and SHALL fail if those sources conflict.

#### Scenario: Canonical sources agree
- **WHEN** all legacy Topic sources identify the same topics and valid canonical snapshots
- **THEN** current Topic state and projection are derived and the existing Topic content remains byte-identical

#### Scenario: Canonical sources conflict
- **WHEN** a topic is missing, invalid, or inconsistent across required legacy sources
- **THEN** migration fails before publishing the current database or production identity

### Requirement: Real-profile acceptance SHALL protect the source sample
The acceptance harness SHALL run against an isolated minimal copy, read the matching Zotero database through a read-only snapshot, and report only schema, counts, statuses, and hashes.

#### Scenario: Acceptance completes
- **WHEN** the representative sample migrates, restarts, and passes ownership and Tag-binding checks
- **THEN** the original database and canonical-tree hashes remain identical to their pre-test values

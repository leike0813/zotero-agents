## ADDED Requirements

### Requirement: Repository readiness SHALL verify additive application tables
Before declaring an existing schema-v1 repository ready, the native repository SHALL idempotently apply the current additive `SCHEMA_SQL` and verify the required application tables and compatible fields. This verification SHALL NOT change the repository schema version or Citation Graph storage format.

#### Scenario: A compatible old schema-v1 database lacks application tables
- **WHEN** the current runtime opens the database
- **THEN** required additive tables are created idempotently before readiness succeeds

#### Scenario: An existing table has an incompatible structure
- **WHEN** additive initialization encounters conflicting fields or constraints
- **THEN** readiness fails closed with `repository_schema_incompatible` and does not report the repository as available

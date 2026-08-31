## ADDED Requirements

### Requirement: Known legacy variants SHALL migrate through one validated publication
The production owner SHALL recognize the documented release-family and development-family repository variants by a read-only structural profile, normalize their durable facts into the current repository shape, validate the complete candidate, and publish the candidate as one atomic replacement. It SHALL reject unknown Synthesis tables or columns with `legacy_schema_variant_unsupported` before creating a backup or modifying production storage.

#### Scenario: Older release upgrades directly
- **WHEN** a production repository matches a supported v0.5-v0.6 or v0.7-v0.8.3 structural profile
- **THEN** the owner migrates it directly to the current Rust repository without requiring an intermediate plugin launch
- **AND** absent fields receive documented empty defaults

#### Scenario: Development facts are present
- **WHEN** a production repository contains the known planning-only or planning-plus-screening development columns
- **THEN** planning, discovery basis, and discovery outcome values are preserved in the published repository

#### Scenario: Unknown shape is present
- **WHEN** a repository contains an unrecognized Synthesis table or column
- **THEN** startup fails with `legacy_schema_variant_unsupported`
- **AND** the source database and canonical store remain byte-for-byte untouched

### Requirement: Migration retry SHALL be idempotent and data-safe
The owner SHALL create at most one source backup for a migration identity, SHALL never expose an intermediate schema as production storage, and SHALL allow an interrupted pre-publication migration to be retried from the same source facts.

#### Scenario: Validation fails before publication
- **WHEN** the normalized candidate fails integrity, count, key, field, hash, or canonical validation
- **THEN** production continues to contain the original source repository
- **AND** a subsequent explicit recovery may safely repeat candidate construction


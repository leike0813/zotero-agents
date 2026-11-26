# Spec Delta

## MODIFIED Requirements

### Requirement: Existing canonical Topics SHALL be adopted without rewriting content
The runtime SHALL classify every recognized legacy Topic Graph row before canonical preflight. Only `materialized` rows with `has_synthesis` definition status SHALL require definitions, resolvers, paper sets, and a valid canonical current snapshot. Known placeholder, stale, and deleted graph-only rows SHALL remain durable migration input without requiring canonical current content. Adoption SHALL preserve pre-existing canonical bytes. It SHALL publish valid Topics and durable graph facts with a persistent record of Topics pending repair. Unknown graph state or an ambiguous shared source inventory SHALL fail before migration writes.

#### Scenario: Canonical sources agree
- **WHEN** every canonical-bearing legacy Topic has matching definitions, resolvers, paper sets, database state, and a valid canonical snapshot
- **THEN** current Topic state and projection are derived and the existing Topic content remains byte-identical

#### Scenario: Known graph-only Topics are present
- **WHEN** the legacy Topic Graph contains planned, stale, or deleted Topic rows and the canonical source omits them or retains metadata for them without a current snapshot
- **THEN** migration preserves those graph rows and canonical bytes
- **AND** only canonical-bearing Topics participate in canonical application projection

#### Scenario: Legacy graph state is unknown
- **WHEN** a legacy Topic Graph row has an unknown or unsupported node-type and definition-status combination
- **THEN** startup fails with `repository_legacy_topic_graph_state_invalid` before backup or migration publication
- **AND** the source database and canonical tree remain unchanged

#### Scenario: One canonical Topic source is invalid
- **WHEN** a classified canonical-bearing Topic is missing, invalid, or inconsistent across required legacy sources
- **THEN** migration SHALL record that Topic as pending repair and continue with independent Topics
- **AND** it SHALL retain the graph facts, original files, and verified legacy database backup.

#### Scenario: A pending Topic is repaired

- **WHEN** a later startup validates the retained source and verifies a valid current snapshot for a pending Topic
- **THEN** the repository SHALL publish its application state and projection and clear the pending record in one transaction.

#### Scenario: Shared source inventory conflicts

- **WHEN** a legacy source Topic identity is unexplained by the classified graph inventory
- **THEN** migration SHALL leave the source database and existing canonical files in place.

### Requirement: Migration retry SHALL be idempotent and data-safe
The owner SHALL create at most one source backup for a migration identity, SHALL never expose an intermediate schema as production storage, and SHALL allow an interrupted pre-publication migration to be retried from the same source facts.

#### Scenario: Validation fails before publication
- **WHEN** the shared candidate repository fails integrity, count, key, field, or hash validation
- **THEN** production continues to contain the original source repository
- **AND** a subsequent explicit recovery may safely repeat candidate construction

## MODIFIED Requirements

### Requirement: Existing canonical Topics SHALL be adopted without rewriting content
The runtime SHALL classify every recognized legacy Topic Graph row before canonical preflight. Only `materialized` rows with `has_synthesis` definition status SHALL require definitions, resolvers, paper sets, and a valid canonical current snapshot. Known placeholder, stale, and deleted graph-only rows SHALL remain durable migration input without requiring canonical current content. Adoption SHALL preserve every pre-existing canonical file byte-for-byte and SHALL fail before migration writes when a graph state is unknown, a canonical-bearing Topic is incomplete or invalid, or canonical source identities are not explained by the classified graph inventory.

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

#### Scenario: Canonical sources conflict
- **WHEN** a canonical-bearing Topic is missing, invalid, or inconsistent across required legacy sources, or a canonical identity is not explained by the classified graph inventory
- **THEN** migration fails before publishing the current database or production identity


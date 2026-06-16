## ADDED Requirements

### Requirement: SQLite is a local materialized Synthesis store

Synthesis persistence SHALL treat SQLite as a local materialized store for Workbench and domain services, not as the cross-device sync artifact.

#### Scenario: Git Sync runs

- **WHEN** Synthesis state is synchronized through Git
- **THEN** `zotero-agents.db`, WAL files, SHM files, runtime locks, runtime logs, credentials, and temporary workspaces SHALL remain local-only
- **AND** the sync payload SHALL be durable assets exported from repository/domain services and topic artifact files.

### Requirement: Durable facts are exportable as canonical Git assets

Long-lived Synthesis facts that cannot be rebuilt from Zotero Library or workflow artifacts SHALL be exportable as durable Git assets.

#### Scenario: Durable facts exist

- **WHEN** concepts, concept senses, aliases, relations, topic links, topic graph facts, canonical reference redirects, reference bindings, review items, discovery decisions, tag vocabulary, or related-items effects exist in SQLite
- **THEN** export SHALL be able to render them into versioned durable asset envelopes.

#### Scenario: Rebuildable projections exist

- **WHEN** cache basis, citation graph cache rows, layout rows, metrics rows, or operation rows exist
- **THEN** export SHALL treat them as local projections or runtime state
- **AND** it SHALL NOT make them durable Git assets.

### Requirement: Import writes durable state through repository APIs

Durable import SHALL write Synthesis facts only through repository/domain services after preview succeeds.

#### Scenario: Import hydrates clean SQLite

- **WHEN** local SQLite has no durable Synthesis facts and a valid Git durable payload is imported
- **THEN** Synthesis SHALL hydrate durable facts through repository/domain APIs
- **AND** rebuildable projections SHALL be marked stale rather than ready.

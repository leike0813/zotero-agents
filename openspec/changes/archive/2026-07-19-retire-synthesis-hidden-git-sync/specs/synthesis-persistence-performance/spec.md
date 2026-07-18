## MODIFIED Requirements

### Requirement: Synthesis durable facts and rebuildable projections are separated

Synthesis persistence SHALL keep durable facts exportable through WebDAV while
treating cache/projection/runtime state as local materialization.

#### Scenario: Durable facts are exported

- **WHEN** concepts, topic graph decisions, reviews, discovery decisions,
  reference bindings, tag vocabulary, topic current source assets, or
  related-items durable effects exist
- **THEN** export SHALL render them into deterministic WebDAV durable bundle
  entries.

#### Scenario: Rebuildable projections exist

- **WHEN** cache basis, citation graph cache rows, layout rows, metrics rows, or
  operation rows exist
- **THEN** export SHALL treat them as local projections or runtime state
- **AND** they SHALL NOT be included in WebDAV bundles or canonical asset
  copies.

### Requirement: Import writes durable state through repository APIs

Durable import SHALL write Synthesis facts only through repository/domain
services after preview succeeds.

#### Scenario: Import hydrates clean SQLite

- **WHEN** local SQLite has no durable Synthesis facts and a valid WebDAV durable
  payload is imported
- **THEN** Synthesis SHALL hydrate durable facts through repository/domain APIs
- **AND** rebuildable projections SHALL be marked stale rather than ready.

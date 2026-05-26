## ADDED Requirements

### Requirement: Workflow products keep indexed metadata and file assets consistent

Workflow product storage SHALL keep SQLite metadata and cached file assets
auditable by the persistence integrity scanner.

#### Scenario: Cached workflow product asset is indexed

- **WHEN** a workflow product caches an asset
- **THEN** its SQLite row SHALL include enough metadata to resolve the cached
  asset path under `runtime/workflow-products/assets`.

#### Scenario: Cached asset is orphaned

- **WHEN** a cached workflow product asset exists without an owning SQLite row
- **THEN** the persistence integrity scan SHALL report it as
  `orphan_file_without_db_row`
- **AND** it SHALL be eligible for explicit cleanup only after the configured
  orphan TTL.

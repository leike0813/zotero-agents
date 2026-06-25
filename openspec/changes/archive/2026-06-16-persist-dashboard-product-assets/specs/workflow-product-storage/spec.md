## MODIFIED Requirements

### Requirement: Workflow hooks can register products

The system SHALL inject a product storage API into workflow `applyResult` hooks.

#### Scenario: Hook registers a local product

- **WHEN** a hook registers assets resolved from a local run workspace
- **THEN** the product storage API SHALL copy those assets into managed workflow product storage under `runtime/workflow-products/assets`
- **AND** the registered asset `localPath` SHALL point at the managed product copy
- **AND** subsequent previews SHALL not require the original run workspace file.

#### Scenario: Hook registers a bundle-only product

- **WHEN** a hook registers assets resolved from result bundle entries
- **THEN** the product storage API SHALL cache those assets into managed workflow product storage under `runtime/workflow-products/assets`
- **AND** subsequent previews SHALL not require the original bundle reader.

#### Scenario: Product storage API remains workflow-controlled

- **WHEN** any workflow hook explicitly calls the product storage API
- **THEN** the store layer SHALL accept the registration without enforcing a workflow id allowlist.

### Requirement: Workflow products keep indexed metadata and file assets consistent

Workflow product storage SHALL keep SQLite metadata and managed file assets auditable by the persistence integrity scanner.

#### Scenario: Managed workflow product asset is indexed

- **WHEN** a workflow product stores an asset
- **THEN** its SQLite row SHALL include enough metadata to resolve the managed asset path under `runtime/workflow-products/assets`
- **AND** its product record SHALL include the managed `cacheDir`.

#### Scenario: Managed asset is orphaned

- **WHEN** a managed workflow product asset exists without an owning SQLite row
- **THEN** the persistence integrity scan SHALL report it as `orphan_file_without_db_row`
- **AND** it SHALL be eligible for explicit cleanup only after the configured orphan TTL.

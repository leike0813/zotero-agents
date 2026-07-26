## MODIFIED Requirements

### Requirement: Workflow hooks can register products

The system SHALL inject a registration-only Product API into workflow apply hooks and SHALL persist every successfully published Product in one managed opaque-object layout.

#### Scenario: Hook registers a Product

- **WHEN** a hook registers logical text or binary assets
- **THEN** storage SHALL preserve each validated Product-relative path as logical metadata
- **AND** SHALL return a bounded registration receipt without managed filesystem paths.

### Requirement: Workflow Product physical paths are bounded

Workflow Product storage SHALL derive fixed-width managed object paths independently of Product identifiers, filenames, and logical directory depth.

#### Scenario: Product has a deep logical asset path

- **WHEN** a Product registers an asset with a valid deep or long relative path
- **THEN** its managed object path SHALL contain only fixed-width Product, revision, and asset keys
- **AND** logical exports and previews SHALL retain the original relative path.

### Requirement: Workflow Product registration is atomically published

Product storage SHALL write a new immutable revision before changing the indexed Product record.

#### Scenario: Product update succeeds

- **WHEN** every required asset is materialized and verified
- **THEN** one Product row update SHALL publish the new revision
- **AND** the previous revision SHALL remain readable until that update succeeds.

#### Scenario: Product update fails

- **WHEN** a required source, write, hash, or metadata commit fails
- **THEN** the previous Product revision SHALL remain authoritative
- **AND** the failed revision SHALL not become visible.

### Requirement: Workflow Product storage has one current record schema

Normal Product reads SHALL accept only schema version 2 records without persisted absolute managed paths.

#### Scenario: Legacy Product records exist at startup

- **WHEN** startup finds legacy Product rows
- **THEN** it SHALL migrate them before Product surfaces become ready
- **AND** normal reads SHALL NOT use the legacy directory layout.

#### Scenario: Migration cannot complete

- **WHEN** a transient migration read, write, or metadata operation fails
- **THEN** the legacy row and bytes SHALL remain untouched
- **AND** Product surfaces SHALL report a retryable migration-incomplete state.

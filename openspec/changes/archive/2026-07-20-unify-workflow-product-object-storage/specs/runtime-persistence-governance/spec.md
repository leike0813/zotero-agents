## MODIFIED Requirements

### Requirement: Runtime persistence audits Workflow Product objects

Runtime persistence integrity SHALL derive referenced Product objects from strict v2 records and SHALL treat unreferenced revisions and legacy directories as orphan data.

#### Scenario: Managed Product object is indexed

- **WHEN** integrity scanning visits an available v2 asset
- **THEN** it SHALL derive the expected object path from Product identity, revision, and logical asset identity
- **AND** report a missing object without trusting a persisted absolute path.

#### Scenario: Unpublished revision remains after interruption

- **WHEN** a revision directory is not referenced by any v2 Product row
- **THEN** integrity scanning SHALL report its files as orphan data
- **AND** existing orphan TTL policy SHALL govern cleanup eligibility.

#### Scenario: Product migration is incomplete

- **WHEN** one or more legacy rows cannot be migrated
- **THEN** persistence diagnostics SHALL expose a retryable migration-incomplete state
- **AND** SHALL not publish a mixed-layout Product view.

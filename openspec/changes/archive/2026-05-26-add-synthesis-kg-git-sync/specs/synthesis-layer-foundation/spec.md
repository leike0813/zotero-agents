## ADDED Requirements

### Requirement: Synthesis foundation manages canonical transactions and derived projection state

Foundation SHALL provide reusable transaction, event, diagnostics, and projection stale helpers for canonical store domains.

#### Scenario: Git Sync imports canonical assets

- **WHEN** Git Sync atomically promotes validated canonical assets
- **THEN** Foundation helpers SHALL emit one `canonical-store-changed` event for the import
- **AND** affected projections SHALL be marked stale.

#### Scenario: Git Sync validates a canonical exchange snapshot

- **WHEN** a canonical exchange snapshot is validated
- **THEN** Foundation-compatible diagnostics SHALL include only asset scope, relative path, hash, schema version, and error code
- **AND** diagnostics SHALL NOT contain tokens or unsanitized absolute paths.

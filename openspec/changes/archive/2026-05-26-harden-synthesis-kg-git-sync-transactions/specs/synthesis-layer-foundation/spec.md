## MODIFIED Requirements

### Requirement: Synthesis foundation manages canonical transactions and derived projection state

Foundation SHALL provide reusable transaction, event, diagnostics, and projection stale helpers for canonical store domains.

#### Scenario: Raw canonical envelope batch commits

- **WHEN** a caller commits already-validated canonical envelope text assets
- **THEN** Foundation SHALL stage all assets before promotion
- **AND** emit one receipt and one `canonical-store-changed` event covering all changed assets
- **AND** mark requested projections stale.

#### Scenario: Raw canonical envelope batch promotion fails

- **WHEN** one asset cannot be promoted during the batch
- **THEN** Foundation SHALL restore overwritten targets from backup where possible
- **AND** remove newly-created targets from the failed batch where possible
- **AND** write sanitized failure diagnostics.

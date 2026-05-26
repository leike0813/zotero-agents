## MODIFIED Requirements

### Requirement: Synthesis foundation manages canonical transactions and derived projection state

Foundation SHALL provide reusable transaction, event, diagnostics, and projection stale helpers for canonical store domains.

#### Scenario: Service-level canonical transaction commits

- **WHEN** a Synthesis service method completes a successful canonical transaction
- **THEN** the emitted `canonical-store-changed` event SHALL be available for service-level Git Sync autosync notification
- **AND** notification failure SHALL NOT change the committed transaction receipt or projection stale state.
